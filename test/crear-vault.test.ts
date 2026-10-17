/**
 * Alta de vault desde el plugin: el material se genera localmente, al server solo viaja el
 * material PÚBLICO y el estado local queda listo para el motor. Lo que se prueba es el
 * contrato completo: qué viaja, qué queda guardado y que el wrap abra con la password.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deriveKek, deriveSubkeys, unwrapKeyPw } from '@ovaultd/crypto';
import { b64Decode, toHex } from '@ovaultd/protocol';

import { MotorDeSync, type EstadoLocalDelPlugin } from '../src/sync-engine';

const RUTA_ESTADO = '.obsidian/plugins/ovaultd/estado-local.json';
const RUTA_SESION = '.obsidian/plugins/ovaultd/sesion-cuenta.json';

function appFake() {
  const archivos = new Map<string, string>();
  return {
    archivos,
    app: {
      vault: {
        adapter: {
          async read(ruta: string) {
            const contenido = archivos.get(ruta);
            if (contenido === undefined) throw new Error('no existe');
            return contenido;
          },
          async write(ruta: string, contenido: string) {
            archivos.set(ruta, contenido);
          },
          async remove(ruta: string) {
            archivos.delete(ruta);
          },
        },
      },
    },
  };
}

let pedidos: { url: string; init?: RequestInit }[] = [];

function mockearFetch(responder: (url: string) => Response | null) {
  vi.stubGlobal('fetch', async (url: string | URL, init?: RequestInit) => {
    pedidos.push({ url: String(url), init });
    const respuesta = responder(String(url));
    if (respuesta === null) return new Response('no manejado', { status: 404 });
    return respuesta;
  });
}

const json = (cuerpo: unknown, status = 200): Response =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/**
 * Mock stateful de un vault: el alta guarda el material, el PUT del material actualiza la
 * envuelta, y el GET sirve SIEMPRE el estado actual (así el vincular final desenvuelve con
 * la password vigente). El DELETE responde 204.
 */
function mockVaultEnMemoria() {
  let material: Record<string, unknown> | null = null;
  let ultimaEnvuelta: string | null = null;

  const responder = (url: string): Response | null => {
    if (url.endsWith('/api/v1/auth/signin')) return json({ token: 'tk-1', device_id: 7 });
    if (url.endsWith('/api/v1/vaults')) {
      const ultimo = pedidos[pedidos.length - 1];
      if (ultimo?.init?.method === 'POST') {
        material = JSON.parse(String(ultimo.init.body)) as Record<string, unknown>;
        return json({ id: 42 });
      }
      return json([{ id: 42, name: 'Mi vault', role: 'owner' }]);
    }
    if (url.endsWith('/api/v1/vaults/42/material')) {
      const ultimo = pedidos[pedidos.length - 1];
      if (ultimo?.init?.method === 'PUT') {
        ultimaEnvuelta = (JSON.parse(String(ultimo.init.body)) as { wrapped_key_pw: string })
          .wrapped_key_pw;
        return json({ ok: true });
      }
      return json({
        id: 42,
        vault_id: material?.vault_id,
        name: 'Mi vault',
        epoch: 1,
        salt: material?.salt,
        kdf_alg: 'argon2id',
        kdf_params: JSON.stringify(material?.kdf_params),
        wrapped_key_pw: ultimaEnvuelta ?? material?.wrapped_key_pw,
        wrapped_key_rc: material?.wrapped_key_rc,
        vault_pubkey: material?.vault_pubkey,
      });
    }
    if (url.includes('/api/v1/vaults/42?confirm=')) {
      return new Response(null, { status: 204 });
    }
    return null;
  };

  return { responder, material: () => material, envuelta: () => ultimaEnvuelta };
}

beforeEach(() => {
  pedidos = [];
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('crear vault desde el plugin', () => {
  it('genera el material localmente, lo registra y deja el estado vinculado', async () => {
    const { app, archivos } = appFake();
    vi.spyOn(MotorDeSync.prototype, 'iniciar').mockResolvedValue();
    mockearFetch((url) => {
      if (url.endsWith('/api/v1/auth/signin')) return json({ token: 'tk-1', device_id: 7 });
      if (url.endsWith('/api/v1/vaults')) return json({ id: 42 });
      return null;
    });

    const motor = new MotorDeSync(app as never, () => undefined);
    await motor.entrar({
      serverUrl: 'http://127.0.0.1:8894',
      email: 'quien@ejemplo.com',
      passwordCuenta: 'password-de-prueba',
    });
    const resultado = await motor.crearVault({
      nombre: 'Mi vault',
      passwordVault: 'password-de-prueba',
    });

    expect(resultado.id).toBe(42);
    expect(resultado.recoveryHex).toMatch(/^[0-9a-f]{64}$/);

    // 1) Las credenciales de cuenta viajan SOLO al login (una vez).
    const signin = pedidos.find((p) => p.url.endsWith('/api/v1/auth/signin'));
    expect(JSON.parse(String(signin?.init?.body))).toMatchObject({
      email: 'quien@ejemplo.com',
      password: 'password-de-prueba',
      name: 'obsidian',
      platform: 'obsidian',
    });

    // 2) El alta: material público con el token del device, sin rastros de secretos.
    const alta = pedidos.find((p) => p.url.endsWith('/api/v1/vaults'));
    expect(alta?.init?.method).toBe('POST');
    expect(alta?.init?.headers).toMatchObject({ authorization: 'Bearer tk-1' });
    const cuerpo = JSON.parse(String(alta?.init?.body)) as Record<string, unknown>;
    expect(cuerpo.name).toBe('Mi vault');
    expect(b64Decode(String(cuerpo.vault_id))).toHaveLength(16);
    expect(b64Decode(String(cuerpo.salt))).toHaveLength(16);
    expect(b64Decode(String(cuerpo.vault_pubkey))).toHaveLength(32);
    expect(String(cuerpo.wrapped_key_pw).length).toBeGreaterThan(0);
    expect(String(cuerpo.wrapped_key_rc).length).toBeGreaterThan(0);
    const serializado = JSON.stringify(cuerpo);
    expect(serializado).not.toContain('password-de-prueba');

    // 3) El estado local: vinculado, con la cuenta y los subkeys.
    const estado = JSON.parse(archivos.get(RUTA_ESTADO) ?? '') as EstadoLocalDelPlugin;
    expect(estado.serverUrl).toBe('http://127.0.0.1:8894');
    expect(estado.cuenta).toMatchObject({ email: 'quien@ejemplo.com', token: 'tk-1', deviceId: 7 });
    expect(estado.vault).toMatchObject({ numero: 42, nombre: 'Mi vault', epoch: 1 });

    // 4) La prueba de fuego: el wrap abre con la password elegida y deriva EXACTAMENTE
    //    los subkeys guardados (si esto falla, el vault nace ilegible).
    const salt = b64Decode(String(cuerpo.salt));
    const uuid = b64Decode(String(cuerpo.vault_id));
    const kek = deriveKek('password-de-prueba', salt);
    const vaultKey = unwrapKeyPw(b64Decode(String(cuerpo.wrapped_key_pw)), kek, uuid, salt);
    const subkeys = deriveSubkeys(vaultKey, salt);
    expect(toHex(subkeys.content)).toBe(estado.vault.subclaves.content);
    expect(toHex(subkeys.sign)).toBe(estado.vault.subclaves.sign);
  });

  it('si el login falla, propaga el error y NO deja estado a medias', async () => {
    const { app, archivos } = appFake();
    vi.spyOn(MotorDeSync.prototype, 'iniciar').mockResolvedValue();
    mockearFetch((url) => {
      if (url.endsWith('/api/v1/auth/signin')) {
        return json({ error: 'credenciales inválidas' }, 403);
      }
      if (url.endsWith('/api/v1/vaults')) return json({ id: 42 });
      return null;
    });

    const motor = new MotorDeSync(app as never, () => undefined);
    await expect(
      motor.entrar({
        serverUrl: 'http://127.0.0.1:8894',
        email: 'quien@ejemplo.com',
        passwordCuenta: 'mala-password-de-prueba',
      }),
    ).rejects.toThrow();

    // Sin sesión no se puede crear: no hay camino a medias.
    await expect(
      motor.crearVault({ nombre: 'Mi vault', passwordVault: 'password-de-prueba' }),
    ).rejects.toThrow(/entrá/);

    expect(archivos.has(RUTA_ESTADO)).toBe(false);
    expect(archivos.has(RUTA_SESION)).toBe(false);
    expect(pedidos.some((p) => p.url.endsWith('/api/v1/vaults'))).toBe(false);
  });

  it('desvincular borra el estado local y deja el motor apagado', async () => {
    const { app, archivos } = appFake();
    vi.spyOn(MotorDeSync.prototype, 'iniciar').mockResolvedValue();
    mockearFetch((url) => {
      if (url.endsWith('/api/v1/auth/signin')) return json({ token: 'tk-1', device_id: 7 });
      if (url.endsWith('/api/v1/vaults')) return json({ id: 42 });
      return null;
    });

    const motor = new MotorDeSync(app as never, () => undefined);
    await motor.entrar({
      serverUrl: 'http://127.0.0.1:8894',
      email: 'quien@ejemplo.com',
      passwordCuenta: 'password-de-prueba',
    });
    await motor.crearVault({
      nombre: 'Mi vault',
      passwordVault: 'password-de-prueba',
    });
    expect(motor.vinculado).toBe(true);
    expect(archivos.has(RUTA_ESTADO)).toBe(true);

    await motor.desvincular();

    expect(motor.vinculado).toBe(false);
    expect(archivos.has(RUTA_ESTADO)).toBe(false);
    expect(motor.estado.fase).toBe('apagado');
    // La SESIÓN de cuenta sobrevive al desvínculo (el modelo es: cuenta ≠ carpeta).
    expect(archivos.has(RUTA_SESION)).toBe(true);
    expect(motor.cuentaConectada).not.toBeNull();
  });

  it('recuperar con la recovery key: re-sella la envuelta y vincula con la password nueva', async () => {
    const { app, archivos } = appFake();
    vi.spyOn(MotorDeSync.prototype, 'iniciar').mockResolvedValue();
    const vault = mockVaultEnMemoria();
    mockearFetch(vault.responder);

    const motor = new MotorDeSync(app as never, () => undefined);
    await motor.entrar({
      serverUrl: 'http://127.0.0.1:8894',
      email: 'quien@ejemplo.com',
      passwordCuenta: 'password-de-prueba',
    });
    const alta = await motor.crearVault({
      nombre: 'Mi vault',
      passwordVault: 'password-de-prueba',
    });

    // Device nuevo: sin vínculo local (la sesión queda).
    await motor.desvincular();
    expect(motor.vinculado).toBe(false);

    const mensaje = await motor.recuperarVault({
      numeroVault: 42,
      recoveryHex: alta.recoveryHex,
      passwordNueva: 'password-nueva-de-prueba',
    });

    expect(mensaje).toContain('vinculado');
    expect(motor.vinculado).toBe(true);
    expect(archivos.has(RUTA_ESTADO)).toBe(true);

    // La prueba irrefutable: la envuelta NUEVA abre con la password NUEVA y desenvuelve la
    // MISMA vault_key que la envuelta vieja abría con la password vieja.
    const material = vault.material()!;
    const salt = b64Decode(String(material.salt));
    const uuid = b64Decode(String(material.vault_id));
    const kdf = material.kdf_params as { m_kib: number; t: number; p: number; dk_len: number };

    const kekNueva = deriveKek('password-nueva-de-prueba', salt, kdf);
    const vkNueva = unwrapKeyPw(b64Decode(vault.envuelta()!), kekNueva, uuid, salt);
    const kekVieja = deriveKek('password-de-prueba', salt, kdf);
    const vkVieja = unwrapKeyPw(b64Decode(String(material.wrapped_key_pw)), kekVieja, uuid, salt);
    expect(toHex(vkNueva)).toBe(toHex(vkVieja));

    // Y una recovery equivocada no abre nada.
    await motor.desvincular();
    await expect(
      motor.recuperarVault({
        numeroVault: 42,
        recoveryHex: 'ab'.repeat(32),
        passwordNueva: 'password-nueva-de-prueba',
      }),
    ).rejects.toThrow(/no abre/);
  }, 30_000);

  it('cambiar la password del vault valida la actual y re-sella la envuelta', async () => {
    const { app } = appFake();
    vi.spyOn(MotorDeSync.prototype, 'iniciar').mockResolvedValue();
    const vault = mockVaultEnMemoria();
    mockearFetch(vault.responder);

    const motor = new MotorDeSync(app as never, () => undefined);
    await motor.entrar({
      serverUrl: 'http://127.0.0.1:8894',
      email: 'quien@ejemplo.com',
      passwordCuenta: 'password-de-prueba',
    });
    await motor.crearVault({ nombre: 'Mi vault', passwordVault: 'password-de-prueba' });

    // Con la actual MALA: rebota sin tocar el material.
    await expect(
      motor.cambiarPasswordVault({
        numeroVault: 42,
        passwordActual: 'mala-de-prueba',
        passwordNueva: 'otra-de-prueba',
      }),
    ).rejects.toThrow(/actual/);
    expect(vault.envuelta()).toBeNull();

    // Con la actual correcta: re-sella y la nueva abre la MISMA vault_key.
    await motor.cambiarPasswordVault({
      numeroVault: 42,
      passwordActual: 'password-de-prueba',
      passwordNueva: 'otra-de-prueba',
    });

    const material = vault.material()!;
    const salt = b64Decode(String(material.salt));
    const uuid = b64Decode(String(material.vault_id));
    const kdf = material.kdf_params as { m_kib: number; t: number; p: number; dk_len: number };
    const kekNueva = deriveKek('otra-de-prueba', salt, kdf);
    const vkNueva = unwrapKeyPw(b64Decode(vault.envuelta()!), kekNueva, uuid, salt);
    const kekOriginal = deriveKek('password-de-prueba', salt, kdf);
    const vkOriginal = unwrapKeyPw(b64Decode(String(material.wrapped_key_pw)), kekOriginal, uuid, salt);
    expect(toHex(vkNueva)).toBe(toHex(vkOriginal));
  }, 30_000);

  it('borrar vault manda la confirmación y desvincula si era el de esta carpeta', async () => {
    const { app } = appFake();
    vi.spyOn(MotorDeSync.prototype, 'iniciar').mockResolvedValue();
    const vault = mockVaultEnMemoria();
    mockearFetch(vault.responder);

    const motor = new MotorDeSync(app as never, () => undefined);
    await motor.entrar({
      serverUrl: 'http://127.0.0.1:8894',
      email: 'quien@ejemplo.com',
      passwordCuenta: 'password-de-prueba',
    });
    await motor.crearVault({ nombre: 'Mi vault', passwordVault: 'password-de-prueba' });
    expect(motor.vinculado).toBe(true);

    await motor.borrarVault(42, 'Mi vault');

    const borrado = pedidos.find((p) => p.init?.method === 'DELETE');
    expect(borrado?.url).toContain('confirm=Mi%20vault');
    expect(motor.vinculado).toBe(false);
  });
});
