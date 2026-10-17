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
    const resultado = await motor.crearVault({
      serverUrl: 'http://127.0.0.1:8894',
      email: 'quien@ejemplo.com',
      passwordCuenta: 'password-de-prueba',
      nombre: 'Mi vault',
      passwordVault: 'password-vault',
    });

    expect(resultado.id).toBe(42);
    expect(resultado.recoveryHex).toMatch(/^[0-9a-f]{64}$/);

    // 1) Las credenciales de cuenta viajan SOLO al signin.
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
    expect(serializado).not.toContain('password-vault');

    // 3) El estado local: vinculado, con la cuenta y los subkeys.
    const estado = JSON.parse(archivos.get(RUTA_ESTADO) ?? '') as EstadoLocalDelPlugin;
    expect(estado.serverUrl).toBe('http://127.0.0.1:8894');
    expect(estado.cuenta).toMatchObject({ email: 'quien@ejemplo.com', token: 'tk-1', deviceId: 7 });
    expect(estado.vault).toMatchObject({ numero: 42, nombre: 'Mi vault', epoch: 1 });

    // 4) La prueba de fuego: el wrap abre con la password elegida y deriva EXACTAMENTE
    //    los subkeys guardados (si esto falla, el vault nace ilegible).
    const salt = b64Decode(String(cuerpo.salt));
    const uuid = b64Decode(String(cuerpo.vault_id));
    const kek = deriveKek('password-vault', salt);
    const vaultKey = unwrapKeyPw(b64Decode(String(cuerpo.wrapped_key_pw)), kek, uuid, salt);
    const subkeys = deriveSubkeys(vaultKey, salt);
    expect(toHex(subkeys.content)).toBe(estado.vault.subclaves.content);
    expect(toHex(subkeys.sign)).toBe(estado.vault.subclaves.sign);
  });

  it('si el signin falla, propaga el error y NO deja estado a medias', async () => {
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
      motor.crearVault({
        serverUrl: 'http://127.0.0.1:8894',
        email: 'quien@ejemplo.com',
        passwordCuenta: 'mala-password',
        nombre: 'Mi vault',
        passwordVault: 'password-vault',
      }),
    ).rejects.toThrow();

    // Sin estado y sin alta: el fallo no deja el plugin "medio vinculado".
    expect(archivos.has(RUTA_ESTADO)).toBe(false);
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
    await motor.crearVault({
      serverUrl: 'http://127.0.0.1:8894',
      email: 'quien@ejemplo.com',
      passwordCuenta: 'password-de-prueba',
      nombre: 'Mi vault',
      passwordVault: 'password-de-prueba',
    });
    expect(motor.vinculado).toBe(true);
    expect(archivos.has(RUTA_ESTADO)).toBe(true);

    await motor.desvincular();

    expect(motor.vinculado).toBe(false);
    expect(archivos.has(RUTA_ESTADO)).toBe(false);
    expect(motor.estado.fase).toBe('apagado');
  });
});
