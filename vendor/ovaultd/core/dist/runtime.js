"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod2) => function __require() {
    try {
      return mod2 || (0, cb[__getOwnPropNames(cb)[0]])((mod2 = { exports: {} }).exports, mod2), mod2.exports;
    } catch (e) {
      throw mod2 = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod2, isNodeMode, target) => (target = mod2 != null ? __create(__getProtoOf(mod2)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod2 || !mod2.__esModule ? __defProp(target, "default", { value: mod2, enumerable: true }) : target,
    mod2
  ));

  // ../../node_modules/diff-match-patch/index.js
  var require_diff_match_patch = __commonJS({
    "../../node_modules/diff-match-patch/index.js"(exports, module) {
      var diff_match_patch = function() {
        this.Diff_Timeout = 1;
        this.Diff_EditCost = 4;
        this.Match_Threshold = 0.5;
        this.Match_Distance = 1e3;
        this.Patch_DeleteThreshold = 0.5;
        this.Patch_Margin = 4;
        this.Match_MaxBits = 32;
      };
      var DIFF_DELETE = -1;
      var DIFF_INSERT = 1;
      var DIFF_EQUAL = 0;
      diff_match_patch.Diff = function(op, text2) {
        return [op, text2];
      };
      diff_match_patch.prototype.diff_main = function(text1, text2, opt_checklines, opt_deadline) {
        if (typeof opt_deadline == "undefined") {
          if (this.Diff_Timeout <= 0) {
            opt_deadline = Number.MAX_VALUE;
          } else {
            opt_deadline = (/* @__PURE__ */ new Date()).getTime() + this.Diff_Timeout * 1e3;
          }
        }
        var deadline = opt_deadline;
        if (text1 == null || text2 == null) {
          throw new Error("Null input. (diff_main)");
        }
        if (text1 == text2) {
          if (text1) {
            return [new diff_match_patch.Diff(DIFF_EQUAL, text1)];
          }
          return [];
        }
        if (typeof opt_checklines == "undefined") {
          opt_checklines = true;
        }
        var checklines = opt_checklines;
        var commonlength = this.diff_commonPrefix(text1, text2);
        var commonprefix = text1.substring(0, commonlength);
        text1 = text1.substring(commonlength);
        text2 = text2.substring(commonlength);
        commonlength = this.diff_commonSuffix(text1, text2);
        var commonsuffix = text1.substring(text1.length - commonlength);
        text1 = text1.substring(0, text1.length - commonlength);
        text2 = text2.substring(0, text2.length - commonlength);
        var diffs = this.diff_compute_(text1, text2, checklines, deadline);
        if (commonprefix) {
          diffs.unshift(new diff_match_patch.Diff(DIFF_EQUAL, commonprefix));
        }
        if (commonsuffix) {
          diffs.push(new diff_match_patch.Diff(DIFF_EQUAL, commonsuffix));
        }
        this.diff_cleanupMerge(diffs);
        return diffs;
      };
      diff_match_patch.prototype.diff_compute_ = function(text1, text2, checklines, deadline) {
        var diffs;
        if (!text1) {
          return [new diff_match_patch.Diff(DIFF_INSERT, text2)];
        }
        if (!text2) {
          return [new diff_match_patch.Diff(DIFF_DELETE, text1)];
        }
        var longtext = text1.length > text2.length ? text1 : text2;
        var shorttext = text1.length > text2.length ? text2 : text1;
        var i = longtext.indexOf(shorttext);
        if (i != -1) {
          diffs = [
            new diff_match_patch.Diff(DIFF_INSERT, longtext.substring(0, i)),
            new diff_match_patch.Diff(DIFF_EQUAL, shorttext),
            new diff_match_patch.Diff(
              DIFF_INSERT,
              longtext.substring(i + shorttext.length)
            )
          ];
          if (text1.length > text2.length) {
            diffs[0][0] = diffs[2][0] = DIFF_DELETE;
          }
          return diffs;
        }
        if (shorttext.length == 1) {
          return [
            new diff_match_patch.Diff(DIFF_DELETE, text1),
            new diff_match_patch.Diff(DIFF_INSERT, text2)
          ];
        }
        var hm = this.diff_halfMatch_(text1, text2);
        if (hm) {
          var text1_a = hm[0];
          var text1_b = hm[1];
          var text2_a = hm[2];
          var text2_b = hm[3];
          var mid_common = hm[4];
          var diffs_a = this.diff_main(text1_a, text2_a, checklines, deadline);
          var diffs_b = this.diff_main(text1_b, text2_b, checklines, deadline);
          return diffs_a.concat(
            [new diff_match_patch.Diff(DIFF_EQUAL, mid_common)],
            diffs_b
          );
        }
        if (checklines && text1.length > 100 && text2.length > 100) {
          return this.diff_lineMode_(text1, text2, deadline);
        }
        return this.diff_bisect_(text1, text2, deadline);
      };
      diff_match_patch.prototype.diff_lineMode_ = function(text1, text2, deadline) {
        var a = this.diff_linesToChars_(text1, text2);
        text1 = a.chars1;
        text2 = a.chars2;
        var linearray = a.lineArray;
        var diffs = this.diff_main(text1, text2, false, deadline);
        this.diff_charsToLines_(diffs, linearray);
        this.diff_cleanupSemantic(diffs);
        diffs.push(new diff_match_patch.Diff(DIFF_EQUAL, ""));
        var pointer = 0;
        var count_delete = 0;
        var count_insert = 0;
        var text_delete = "";
        var text_insert = "";
        while (pointer < diffs.length) {
          switch (diffs[pointer][0]) {
            case DIFF_INSERT:
              count_insert++;
              text_insert += diffs[pointer][1];
              break;
            case DIFF_DELETE:
              count_delete++;
              text_delete += diffs[pointer][1];
              break;
            case DIFF_EQUAL:
              if (count_delete >= 1 && count_insert >= 1) {
                diffs.splice(
                  pointer - count_delete - count_insert,
                  count_delete + count_insert
                );
                pointer = pointer - count_delete - count_insert;
                var subDiff = this.diff_main(text_delete, text_insert, false, deadline);
                for (var j = subDiff.length - 1; j >= 0; j--) {
                  diffs.splice(pointer, 0, subDiff[j]);
                }
                pointer = pointer + subDiff.length;
              }
              count_insert = 0;
              count_delete = 0;
              text_delete = "";
              text_insert = "";
              break;
          }
          pointer++;
        }
        diffs.pop();
        return diffs;
      };
      diff_match_patch.prototype.diff_bisect_ = function(text1, text2, deadline) {
        var text1_length = text1.length;
        var text2_length = text2.length;
        var max_d = Math.ceil((text1_length + text2_length) / 2);
        var v_offset = max_d;
        var v_length = 2 * max_d;
        var v1 = new Array(v_length);
        var v2 = new Array(v_length);
        for (var x = 0; x < v_length; x++) {
          v1[x] = -1;
          v2[x] = -1;
        }
        v1[v_offset + 1] = 0;
        v2[v_offset + 1] = 0;
        var delta = text1_length - text2_length;
        var front = delta % 2 != 0;
        var k1start = 0;
        var k1end = 0;
        var k2start = 0;
        var k2end = 0;
        for (var d = 0; d < max_d; d++) {
          if ((/* @__PURE__ */ new Date()).getTime() > deadline) {
            break;
          }
          for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
            var k1_offset = v_offset + k1;
            var x1;
            if (k1 == -d || k1 != d && v1[k1_offset - 1] < v1[k1_offset + 1]) {
              x1 = v1[k1_offset + 1];
            } else {
              x1 = v1[k1_offset - 1] + 1;
            }
            var y1 = x1 - k1;
            while (x1 < text1_length && y1 < text2_length && text1.charAt(x1) == text2.charAt(y1)) {
              x1++;
              y1++;
            }
            v1[k1_offset] = x1;
            if (x1 > text1_length) {
              k1end += 2;
            } else if (y1 > text2_length) {
              k1start += 2;
            } else if (front) {
              var k2_offset = v_offset + delta - k1;
              if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] != -1) {
                var x2 = text1_length - v2[k2_offset];
                if (x1 >= x2) {
                  return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
                }
              }
            }
          }
          for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
            var k2_offset = v_offset + k2;
            var x2;
            if (k2 == -d || k2 != d && v2[k2_offset - 1] < v2[k2_offset + 1]) {
              x2 = v2[k2_offset + 1];
            } else {
              x2 = v2[k2_offset - 1] + 1;
            }
            var y2 = x2 - k2;
            while (x2 < text1_length && y2 < text2_length && text1.charAt(text1_length - x2 - 1) == text2.charAt(text2_length - y2 - 1)) {
              x2++;
              y2++;
            }
            v2[k2_offset] = x2;
            if (x2 > text1_length) {
              k2end += 2;
            } else if (y2 > text2_length) {
              k2start += 2;
            } else if (!front) {
              var k1_offset = v_offset + delta - k2;
              if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] != -1) {
                var x1 = v1[k1_offset];
                var y1 = v_offset + x1 - k1_offset;
                x2 = text1_length - x2;
                if (x1 >= x2) {
                  return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
                }
              }
            }
          }
        }
        return [
          new diff_match_patch.Diff(DIFF_DELETE, text1),
          new diff_match_patch.Diff(DIFF_INSERT, text2)
        ];
      };
      diff_match_patch.prototype.diff_bisectSplit_ = function(text1, text2, x, y, deadline) {
        var text1a = text1.substring(0, x);
        var text2a = text2.substring(0, y);
        var text1b = text1.substring(x);
        var text2b = text2.substring(y);
        var diffs = this.diff_main(text1a, text2a, false, deadline);
        var diffsb = this.diff_main(text1b, text2b, false, deadline);
        return diffs.concat(diffsb);
      };
      diff_match_patch.prototype.diff_linesToChars_ = function(text1, text2) {
        var lineArray = [];
        var lineHash = {};
        lineArray[0] = "";
        function diff_linesToCharsMunge_(text3) {
          var chars = "";
          var lineStart = 0;
          var lineEnd = -1;
          var lineArrayLength = lineArray.length;
          while (lineEnd < text3.length - 1) {
            lineEnd = text3.indexOf("\n", lineStart);
            if (lineEnd == -1) {
              lineEnd = text3.length - 1;
            }
            var line = text3.substring(lineStart, lineEnd + 1);
            if (lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) : lineHash[line] !== void 0) {
              chars += String.fromCharCode(lineHash[line]);
            } else {
              if (lineArrayLength == maxLines) {
                line = text3.substring(lineStart);
                lineEnd = text3.length;
              }
              chars += String.fromCharCode(lineArrayLength);
              lineHash[line] = lineArrayLength;
              lineArray[lineArrayLength++] = line;
            }
            lineStart = lineEnd + 1;
          }
          return chars;
        }
        var maxLines = 4e4;
        var chars1 = diff_linesToCharsMunge_(text1);
        maxLines = 65535;
        var chars2 = diff_linesToCharsMunge_(text2);
        return { chars1, chars2, lineArray };
      };
      diff_match_patch.prototype.diff_charsToLines_ = function(diffs, lineArray) {
        for (var i = 0; i < diffs.length; i++) {
          var chars = diffs[i][1];
          var text2 = [];
          for (var j = 0; j < chars.length; j++) {
            text2[j] = lineArray[chars.charCodeAt(j)];
          }
          diffs[i][1] = text2.join("");
        }
      };
      diff_match_patch.prototype.diff_commonPrefix = function(text1, text2) {
        if (!text1 || !text2 || text1.charAt(0) != text2.charAt(0)) {
          return 0;
        }
        var pointermin = 0;
        var pointermax = Math.min(text1.length, text2.length);
        var pointermid = pointermax;
        var pointerstart = 0;
        while (pointermin < pointermid) {
          if (text1.substring(pointerstart, pointermid) == text2.substring(pointerstart, pointermid)) {
            pointermin = pointermid;
            pointerstart = pointermin;
          } else {
            pointermax = pointermid;
          }
          pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
        }
        return pointermid;
      };
      diff_match_patch.prototype.diff_commonSuffix = function(text1, text2) {
        if (!text1 || !text2 || text1.charAt(text1.length - 1) != text2.charAt(text2.length - 1)) {
          return 0;
        }
        var pointermin = 0;
        var pointermax = Math.min(text1.length, text2.length);
        var pointermid = pointermax;
        var pointerend = 0;
        while (pointermin < pointermid) {
          if (text1.substring(text1.length - pointermid, text1.length - pointerend) == text2.substring(text2.length - pointermid, text2.length - pointerend)) {
            pointermin = pointermid;
            pointerend = pointermin;
          } else {
            pointermax = pointermid;
          }
          pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
        }
        return pointermid;
      };
      diff_match_patch.prototype.diff_commonOverlap_ = function(text1, text2) {
        var text1_length = text1.length;
        var text2_length = text2.length;
        if (text1_length == 0 || text2_length == 0) {
          return 0;
        }
        if (text1_length > text2_length) {
          text1 = text1.substring(text1_length - text2_length);
        } else if (text1_length < text2_length) {
          text2 = text2.substring(0, text1_length);
        }
        var text_length = Math.min(text1_length, text2_length);
        if (text1 == text2) {
          return text_length;
        }
        var best = 0;
        var length = 1;
        while (true) {
          var pattern = text1.substring(text_length - length);
          var found = text2.indexOf(pattern);
          if (found == -1) {
            return best;
          }
          length += found;
          if (found == 0 || text1.substring(text_length - length) == text2.substring(0, length)) {
            best = length;
            length++;
          }
        }
      };
      diff_match_patch.prototype.diff_halfMatch_ = function(text1, text2) {
        if (this.Diff_Timeout <= 0) {
          return null;
        }
        var longtext = text1.length > text2.length ? text1 : text2;
        var shorttext = text1.length > text2.length ? text2 : text1;
        if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
          return null;
        }
        var dmp = this;
        function diff_halfMatchI_(longtext2, shorttext2, i) {
          var seed = longtext2.substring(i, i + Math.floor(longtext2.length / 4));
          var j = -1;
          var best_common = "";
          var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
          while ((j = shorttext2.indexOf(seed, j + 1)) != -1) {
            var prefixLength = dmp.diff_commonPrefix(
              longtext2.substring(i),
              shorttext2.substring(j)
            );
            var suffixLength = dmp.diff_commonSuffix(
              longtext2.substring(0, i),
              shorttext2.substring(0, j)
            );
            if (best_common.length < suffixLength + prefixLength) {
              best_common = shorttext2.substring(j - suffixLength, j) + shorttext2.substring(j, j + prefixLength);
              best_longtext_a = longtext2.substring(0, i - suffixLength);
              best_longtext_b = longtext2.substring(i + prefixLength);
              best_shorttext_a = shorttext2.substring(0, j - suffixLength);
              best_shorttext_b = shorttext2.substring(j + prefixLength);
            }
          }
          if (best_common.length * 2 >= longtext2.length) {
            return [
              best_longtext_a,
              best_longtext_b,
              best_shorttext_a,
              best_shorttext_b,
              best_common
            ];
          } else {
            return null;
          }
        }
        var hm1 = diff_halfMatchI_(
          longtext,
          shorttext,
          Math.ceil(longtext.length / 4)
        );
        var hm2 = diff_halfMatchI_(
          longtext,
          shorttext,
          Math.ceil(longtext.length / 2)
        );
        var hm;
        if (!hm1 && !hm2) {
          return null;
        } else if (!hm2) {
          hm = hm1;
        } else if (!hm1) {
          hm = hm2;
        } else {
          hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
        }
        var text1_a, text1_b, text2_a, text2_b;
        if (text1.length > text2.length) {
          text1_a = hm[0];
          text1_b = hm[1];
          text2_a = hm[2];
          text2_b = hm[3];
        } else {
          text2_a = hm[0];
          text2_b = hm[1];
          text1_a = hm[2];
          text1_b = hm[3];
        }
        var mid_common = hm[4];
        return [text1_a, text1_b, text2_a, text2_b, mid_common];
      };
      diff_match_patch.prototype.diff_cleanupSemantic = function(diffs) {
        var changes = false;
        var equalities = [];
        var equalitiesLength = 0;
        var lastEquality = null;
        var pointer = 0;
        var length_insertions1 = 0;
        var length_deletions1 = 0;
        var length_insertions2 = 0;
        var length_deletions2 = 0;
        while (pointer < diffs.length) {
          if (diffs[pointer][0] == DIFF_EQUAL) {
            equalities[equalitiesLength++] = pointer;
            length_insertions1 = length_insertions2;
            length_deletions1 = length_deletions2;
            length_insertions2 = 0;
            length_deletions2 = 0;
            lastEquality = diffs[pointer][1];
          } else {
            if (diffs[pointer][0] == DIFF_INSERT) {
              length_insertions2 += diffs[pointer][1].length;
            } else {
              length_deletions2 += diffs[pointer][1].length;
            }
            if (lastEquality && lastEquality.length <= Math.max(length_insertions1, length_deletions1) && lastEquality.length <= Math.max(
              length_insertions2,
              length_deletions2
            )) {
              diffs.splice(
                equalities[equalitiesLength - 1],
                0,
                new diff_match_patch.Diff(DIFF_DELETE, lastEquality)
              );
              diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
              equalitiesLength--;
              equalitiesLength--;
              pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
              length_insertions1 = 0;
              length_deletions1 = 0;
              length_insertions2 = 0;
              length_deletions2 = 0;
              lastEquality = null;
              changes = true;
            }
          }
          pointer++;
        }
        if (changes) {
          this.diff_cleanupMerge(diffs);
        }
        this.diff_cleanupSemanticLossless(diffs);
        pointer = 1;
        while (pointer < diffs.length) {
          if (diffs[pointer - 1][0] == DIFF_DELETE && diffs[pointer][0] == DIFF_INSERT) {
            var deletion = diffs[pointer - 1][1];
            var insertion = diffs[pointer][1];
            var overlap_length1 = this.diff_commonOverlap_(deletion, insertion);
            var overlap_length2 = this.diff_commonOverlap_(insertion, deletion);
            if (overlap_length1 >= overlap_length2) {
              if (overlap_length1 >= deletion.length / 2 || overlap_length1 >= insertion.length / 2) {
                diffs.splice(pointer, 0, new diff_match_patch.Diff(
                  DIFF_EQUAL,
                  insertion.substring(0, overlap_length1)
                ));
                diffs[pointer - 1][1] = deletion.substring(0, deletion.length - overlap_length1);
                diffs[pointer + 1][1] = insertion.substring(overlap_length1);
                pointer++;
              }
            } else {
              if (overlap_length2 >= deletion.length / 2 || overlap_length2 >= insertion.length / 2) {
                diffs.splice(pointer, 0, new diff_match_patch.Diff(
                  DIFF_EQUAL,
                  deletion.substring(0, overlap_length2)
                ));
                diffs[pointer - 1][0] = DIFF_INSERT;
                diffs[pointer - 1][1] = insertion.substring(0, insertion.length - overlap_length2);
                diffs[pointer + 1][0] = DIFF_DELETE;
                diffs[pointer + 1][1] = deletion.substring(overlap_length2);
                pointer++;
              }
            }
            pointer++;
          }
          pointer++;
        }
      };
      diff_match_patch.prototype.diff_cleanupSemanticLossless = function(diffs) {
        function diff_cleanupSemanticScore_(one, two) {
          if (!one || !two) {
            return 6;
          }
          var char1 = one.charAt(one.length - 1);
          var char2 = two.charAt(0);
          var nonAlphaNumeric1 = char1.match(diff_match_patch.nonAlphaNumericRegex_);
          var nonAlphaNumeric2 = char2.match(diff_match_patch.nonAlphaNumericRegex_);
          var whitespace1 = nonAlphaNumeric1 && char1.match(diff_match_patch.whitespaceRegex_);
          var whitespace2 = nonAlphaNumeric2 && char2.match(diff_match_patch.whitespaceRegex_);
          var lineBreak1 = whitespace1 && char1.match(diff_match_patch.linebreakRegex_);
          var lineBreak2 = whitespace2 && char2.match(diff_match_patch.linebreakRegex_);
          var blankLine1 = lineBreak1 && one.match(diff_match_patch.blanklineEndRegex_);
          var blankLine2 = lineBreak2 && two.match(diff_match_patch.blanklineStartRegex_);
          if (blankLine1 || blankLine2) {
            return 5;
          } else if (lineBreak1 || lineBreak2) {
            return 4;
          } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
            return 3;
          } else if (whitespace1 || whitespace2) {
            return 2;
          } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
            return 1;
          }
          return 0;
        }
        var pointer = 1;
        while (pointer < diffs.length - 1) {
          if (diffs[pointer - 1][0] == DIFF_EQUAL && diffs[pointer + 1][0] == DIFF_EQUAL) {
            var equality1 = diffs[pointer - 1][1];
            var edit = diffs[pointer][1];
            var equality2 = diffs[pointer + 1][1];
            var commonOffset = this.diff_commonSuffix(equality1, edit);
            if (commonOffset) {
              var commonString = edit.substring(edit.length - commonOffset);
              equality1 = equality1.substring(0, equality1.length - commonOffset);
              edit = commonString + edit.substring(0, edit.length - commonOffset);
              equality2 = commonString + equality2;
            }
            var bestEquality1 = equality1;
            var bestEdit = edit;
            var bestEquality2 = equality2;
            var bestScore = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
            while (edit.charAt(0) === equality2.charAt(0)) {
              equality1 += edit.charAt(0);
              edit = edit.substring(1) + equality2.charAt(0);
              equality2 = equality2.substring(1);
              var score = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
              if (score >= bestScore) {
                bestScore = score;
                bestEquality1 = equality1;
                bestEdit = edit;
                bestEquality2 = equality2;
              }
            }
            if (diffs[pointer - 1][1] != bestEquality1) {
              if (bestEquality1) {
                diffs[pointer - 1][1] = bestEquality1;
              } else {
                diffs.splice(pointer - 1, 1);
                pointer--;
              }
              diffs[pointer][1] = bestEdit;
              if (bestEquality2) {
                diffs[pointer + 1][1] = bestEquality2;
              } else {
                diffs.splice(pointer + 1, 1);
                pointer--;
              }
            }
          }
          pointer++;
        }
      };
      diff_match_patch.nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/;
      diff_match_patch.whitespaceRegex_ = /\s/;
      diff_match_patch.linebreakRegex_ = /[\r\n]/;
      diff_match_patch.blanklineEndRegex_ = /\n\r?\n$/;
      diff_match_patch.blanklineStartRegex_ = /^\r?\n\r?\n/;
      diff_match_patch.prototype.diff_cleanupEfficiency = function(diffs) {
        var changes = false;
        var equalities = [];
        var equalitiesLength = 0;
        var lastEquality = null;
        var pointer = 0;
        var pre_ins = false;
        var pre_del = false;
        var post_ins = false;
        var post_del = false;
        while (pointer < diffs.length) {
          if (diffs[pointer][0] == DIFF_EQUAL) {
            if (diffs[pointer][1].length < this.Diff_EditCost && (post_ins || post_del)) {
              equalities[equalitiesLength++] = pointer;
              pre_ins = post_ins;
              pre_del = post_del;
              lastEquality = diffs[pointer][1];
            } else {
              equalitiesLength = 0;
              lastEquality = null;
            }
            post_ins = post_del = false;
          } else {
            if (diffs[pointer][0] == DIFF_DELETE) {
              post_del = true;
            } else {
              post_ins = true;
            }
            if (lastEquality && (pre_ins && pre_del && post_ins && post_del || lastEquality.length < this.Diff_EditCost / 2 && pre_ins + pre_del + post_ins + post_del == 3)) {
              diffs.splice(
                equalities[equalitiesLength - 1],
                0,
                new diff_match_patch.Diff(DIFF_DELETE, lastEquality)
              );
              diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
              equalitiesLength--;
              lastEquality = null;
              if (pre_ins && pre_del) {
                post_ins = post_del = true;
                equalitiesLength = 0;
              } else {
                equalitiesLength--;
                pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
                post_ins = post_del = false;
              }
              changes = true;
            }
          }
          pointer++;
        }
        if (changes) {
          this.diff_cleanupMerge(diffs);
        }
      };
      diff_match_patch.prototype.diff_cleanupMerge = function(diffs) {
        diffs.push(new diff_match_patch.Diff(DIFF_EQUAL, ""));
        var pointer = 0;
        var count_delete = 0;
        var count_insert = 0;
        var text_delete = "";
        var text_insert = "";
        var commonlength;
        while (pointer < diffs.length) {
          switch (diffs[pointer][0]) {
            case DIFF_INSERT:
              count_insert++;
              text_insert += diffs[pointer][1];
              pointer++;
              break;
            case DIFF_DELETE:
              count_delete++;
              text_delete += diffs[pointer][1];
              pointer++;
              break;
            case DIFF_EQUAL:
              if (count_delete + count_insert > 1) {
                if (count_delete !== 0 && count_insert !== 0) {
                  commonlength = this.diff_commonPrefix(text_insert, text_delete);
                  if (commonlength !== 0) {
                    if (pointer - count_delete - count_insert > 0 && diffs[pointer - count_delete - count_insert - 1][0] == DIFF_EQUAL) {
                      diffs[pointer - count_delete - count_insert - 1][1] += text_insert.substring(0, commonlength);
                    } else {
                      diffs.splice(0, 0, new diff_match_patch.Diff(
                        DIFF_EQUAL,
                        text_insert.substring(0, commonlength)
                      ));
                      pointer++;
                    }
                    text_insert = text_insert.substring(commonlength);
                    text_delete = text_delete.substring(commonlength);
                  }
                  commonlength = this.diff_commonSuffix(text_insert, text_delete);
                  if (commonlength !== 0) {
                    diffs[pointer][1] = text_insert.substring(text_insert.length - commonlength) + diffs[pointer][1];
                    text_insert = text_insert.substring(0, text_insert.length - commonlength);
                    text_delete = text_delete.substring(0, text_delete.length - commonlength);
                  }
                }
                pointer -= count_delete + count_insert;
                diffs.splice(pointer, count_delete + count_insert);
                if (text_delete.length) {
                  diffs.splice(
                    pointer,
                    0,
                    new diff_match_patch.Diff(DIFF_DELETE, text_delete)
                  );
                  pointer++;
                }
                if (text_insert.length) {
                  diffs.splice(
                    pointer,
                    0,
                    new diff_match_patch.Diff(DIFF_INSERT, text_insert)
                  );
                  pointer++;
                }
                pointer++;
              } else if (pointer !== 0 && diffs[pointer - 1][0] == DIFF_EQUAL) {
                diffs[pointer - 1][1] += diffs[pointer][1];
                diffs.splice(pointer, 1);
              } else {
                pointer++;
              }
              count_insert = 0;
              count_delete = 0;
              text_delete = "";
              text_insert = "";
              break;
          }
        }
        if (diffs[diffs.length - 1][1] === "") {
          diffs.pop();
        }
        var changes = false;
        pointer = 1;
        while (pointer < diffs.length - 1) {
          if (diffs[pointer - 1][0] == DIFF_EQUAL && diffs[pointer + 1][0] == DIFF_EQUAL) {
            if (diffs[pointer][1].substring(diffs[pointer][1].length - diffs[pointer - 1][1].length) == diffs[pointer - 1][1]) {
              diffs[pointer][1] = diffs[pointer - 1][1] + diffs[pointer][1].substring(0, diffs[pointer][1].length - diffs[pointer - 1][1].length);
              diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
              diffs.splice(pointer - 1, 1);
              changes = true;
            } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) == diffs[pointer + 1][1]) {
              diffs[pointer - 1][1] += diffs[pointer + 1][1];
              diffs[pointer][1] = diffs[pointer][1].substring(diffs[pointer + 1][1].length) + diffs[pointer + 1][1];
              diffs.splice(pointer + 1, 1);
              changes = true;
            }
          }
          pointer++;
        }
        if (changes) {
          this.diff_cleanupMerge(diffs);
        }
      };
      diff_match_patch.prototype.diff_xIndex = function(diffs, loc) {
        var chars1 = 0;
        var chars2 = 0;
        var last_chars1 = 0;
        var last_chars2 = 0;
        var x;
        for (x = 0; x < diffs.length; x++) {
          if (diffs[x][0] !== DIFF_INSERT) {
            chars1 += diffs[x][1].length;
          }
          if (diffs[x][0] !== DIFF_DELETE) {
            chars2 += diffs[x][1].length;
          }
          if (chars1 > loc) {
            break;
          }
          last_chars1 = chars1;
          last_chars2 = chars2;
        }
        if (diffs.length != x && diffs[x][0] === DIFF_DELETE) {
          return last_chars2;
        }
        return last_chars2 + (loc - last_chars1);
      };
      diff_match_patch.prototype.diff_prettyHtml = function(diffs) {
        var html = [];
        var pattern_amp = /&/g;
        var pattern_lt = /</g;
        var pattern_gt = />/g;
        var pattern_para = /\n/g;
        for (var x = 0; x < diffs.length; x++) {
          var op = diffs[x][0];
          var data = diffs[x][1];
          var text2 = data.replace(pattern_amp, "&amp;").replace(pattern_lt, "&lt;").replace(pattern_gt, "&gt;").replace(pattern_para, "&para;<br>");
          switch (op) {
            case DIFF_INSERT:
              html[x] = '<ins style="background:#e6ffe6;">' + text2 + "</ins>";
              break;
            case DIFF_DELETE:
              html[x] = '<del style="background:#ffe6e6;">' + text2 + "</del>";
              break;
            case DIFF_EQUAL:
              html[x] = "<span>" + text2 + "</span>";
              break;
          }
        }
        return html.join("");
      };
      diff_match_patch.prototype.diff_text1 = function(diffs) {
        var text2 = [];
        for (var x = 0; x < diffs.length; x++) {
          if (diffs[x][0] !== DIFF_INSERT) {
            text2[x] = diffs[x][1];
          }
        }
        return text2.join("");
      };
      diff_match_patch.prototype.diff_text2 = function(diffs) {
        var text2 = [];
        for (var x = 0; x < diffs.length; x++) {
          if (diffs[x][0] !== DIFF_DELETE) {
            text2[x] = diffs[x][1];
          }
        }
        return text2.join("");
      };
      diff_match_patch.prototype.diff_levenshtein = function(diffs) {
        var levenshtein = 0;
        var insertions = 0;
        var deletions = 0;
        for (var x = 0; x < diffs.length; x++) {
          var op = diffs[x][0];
          var data = diffs[x][1];
          switch (op) {
            case DIFF_INSERT:
              insertions += data.length;
              break;
            case DIFF_DELETE:
              deletions += data.length;
              break;
            case DIFF_EQUAL:
              levenshtein += Math.max(insertions, deletions);
              insertions = 0;
              deletions = 0;
              break;
          }
        }
        levenshtein += Math.max(insertions, deletions);
        return levenshtein;
      };
      diff_match_patch.prototype.diff_toDelta = function(diffs) {
        var text2 = [];
        for (var x = 0; x < diffs.length; x++) {
          switch (diffs[x][0]) {
            case DIFF_INSERT:
              text2[x] = "+" + encodeURI(diffs[x][1]);
              break;
            case DIFF_DELETE:
              text2[x] = "-" + diffs[x][1].length;
              break;
            case DIFF_EQUAL:
              text2[x] = "=" + diffs[x][1].length;
              break;
          }
        }
        return text2.join("	").replace(/%20/g, " ");
      };
      diff_match_patch.prototype.diff_fromDelta = function(text1, delta) {
        var diffs = [];
        var diffsLength = 0;
        var pointer = 0;
        var tokens = delta.split(/\t/g);
        for (var x = 0; x < tokens.length; x++) {
          var param = tokens[x].substring(1);
          switch (tokens[x].charAt(0)) {
            case "+":
              try {
                diffs[diffsLength++] = new diff_match_patch.Diff(DIFF_INSERT, decodeURI(param));
              } catch (ex) {
                throw new Error("Illegal escape in diff_fromDelta: " + param);
              }
              break;
            case "-":
            // Fall through.
            case "=":
              var n = parseInt(param, 10);
              if (isNaN(n) || n < 0) {
                throw new Error("Invalid number in diff_fromDelta: " + param);
              }
              var text2 = text1.substring(pointer, pointer += n);
              if (tokens[x].charAt(0) == "=") {
                diffs[diffsLength++] = new diff_match_patch.Diff(DIFF_EQUAL, text2);
              } else {
                diffs[diffsLength++] = new diff_match_patch.Diff(DIFF_DELETE, text2);
              }
              break;
            default:
              if (tokens[x]) {
                throw new Error("Invalid diff operation in diff_fromDelta: " + tokens[x]);
              }
          }
        }
        if (pointer != text1.length) {
          throw new Error("Delta length (" + pointer + ") does not equal source text length (" + text1.length + ").");
        }
        return diffs;
      };
      diff_match_patch.prototype.match_main = function(text2, pattern, loc) {
        if (text2 == null || pattern == null || loc == null) {
          throw new Error("Null input. (match_main)");
        }
        loc = Math.max(0, Math.min(loc, text2.length));
        if (text2 == pattern) {
          return 0;
        } else if (!text2.length) {
          return -1;
        } else if (text2.substring(loc, loc + pattern.length) == pattern) {
          return loc;
        } else {
          return this.match_bitap_(text2, pattern, loc);
        }
      };
      diff_match_patch.prototype.match_bitap_ = function(text2, pattern, loc) {
        if (pattern.length > this.Match_MaxBits) {
          throw new Error("Pattern too long for this browser.");
        }
        var s = this.match_alphabet_(pattern);
        var dmp = this;
        function match_bitapScore_(e, x) {
          var accuracy = e / pattern.length;
          var proximity = Math.abs(loc - x);
          if (!dmp.Match_Distance) {
            return proximity ? 1 : accuracy;
          }
          return accuracy + proximity / dmp.Match_Distance;
        }
        var score_threshold = this.Match_Threshold;
        var best_loc = text2.indexOf(pattern, loc);
        if (best_loc != -1) {
          score_threshold = Math.min(match_bitapScore_(0, best_loc), score_threshold);
          best_loc = text2.lastIndexOf(pattern, loc + pattern.length);
          if (best_loc != -1) {
            score_threshold = Math.min(match_bitapScore_(0, best_loc), score_threshold);
          }
        }
        var matchmask = 1 << pattern.length - 1;
        best_loc = -1;
        var bin_min, bin_mid;
        var bin_max = pattern.length + text2.length;
        var last_rd;
        for (var d = 0; d < pattern.length; d++) {
          bin_min = 0;
          bin_mid = bin_max;
          while (bin_min < bin_mid) {
            if (match_bitapScore_(d, loc + bin_mid) <= score_threshold) {
              bin_min = bin_mid;
            } else {
              bin_max = bin_mid;
            }
            bin_mid = Math.floor((bin_max - bin_min) / 2 + bin_min);
          }
          bin_max = bin_mid;
          var start = Math.max(1, loc - bin_mid + 1);
          var finish = Math.min(loc + bin_mid, text2.length) + pattern.length;
          var rd = Array(finish + 2);
          rd[finish + 1] = (1 << d) - 1;
          for (var j = finish; j >= start; j--) {
            var charMatch = s[text2.charAt(j - 1)];
            if (d === 0) {
              rd[j] = (rd[j + 1] << 1 | 1) & charMatch;
            } else {
              rd[j] = (rd[j + 1] << 1 | 1) & charMatch | ((last_rd[j + 1] | last_rd[j]) << 1 | 1) | last_rd[j + 1];
            }
            if (rd[j] & matchmask) {
              var score = match_bitapScore_(d, j - 1);
              if (score <= score_threshold) {
                score_threshold = score;
                best_loc = j - 1;
                if (best_loc > loc) {
                  start = Math.max(1, 2 * loc - best_loc);
                } else {
                  break;
                }
              }
            }
          }
          if (match_bitapScore_(d + 1, loc) > score_threshold) {
            break;
          }
          last_rd = rd;
        }
        return best_loc;
      };
      diff_match_patch.prototype.match_alphabet_ = function(pattern) {
        var s = {};
        for (var i = 0; i < pattern.length; i++) {
          s[pattern.charAt(i)] = 0;
        }
        for (var i = 0; i < pattern.length; i++) {
          s[pattern.charAt(i)] |= 1 << pattern.length - i - 1;
        }
        return s;
      };
      diff_match_patch.prototype.patch_addContext_ = function(patch, text2) {
        if (text2.length == 0) {
          return;
        }
        if (patch.start2 === null) {
          throw Error("patch not initialized");
        }
        var pattern = text2.substring(patch.start2, patch.start2 + patch.length1);
        var padding = 0;
        while (text2.indexOf(pattern) != text2.lastIndexOf(pattern) && pattern.length < this.Match_MaxBits - this.Patch_Margin - this.Patch_Margin) {
          padding += this.Patch_Margin;
          pattern = text2.substring(
            patch.start2 - padding,
            patch.start2 + patch.length1 + padding
          );
        }
        padding += this.Patch_Margin;
        var prefix = text2.substring(patch.start2 - padding, patch.start2);
        if (prefix) {
          patch.diffs.unshift(new diff_match_patch.Diff(DIFF_EQUAL, prefix));
        }
        var suffix = text2.substring(
          patch.start2 + patch.length1,
          patch.start2 + patch.length1 + padding
        );
        if (suffix) {
          patch.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL, suffix));
        }
        patch.start1 -= prefix.length;
        patch.start2 -= prefix.length;
        patch.length1 += prefix.length + suffix.length;
        patch.length2 += prefix.length + suffix.length;
      };
      diff_match_patch.prototype.patch_make = function(a, opt_b, opt_c) {
        var text1, diffs;
        if (typeof a == "string" && typeof opt_b == "string" && typeof opt_c == "undefined") {
          text1 = /** @type {string} */
          a;
          diffs = this.diff_main(
            text1,
            /** @type {string} */
            opt_b,
            true
          );
          if (diffs.length > 2) {
            this.diff_cleanupSemantic(diffs);
            this.diff_cleanupEfficiency(diffs);
          }
        } else if (a && typeof a == "object" && typeof opt_b == "undefined" && typeof opt_c == "undefined") {
          diffs = /** @type {!Array.<!diff_match_patch.Diff>} */
          a;
          text1 = this.diff_text1(diffs);
        } else if (typeof a == "string" && opt_b && typeof opt_b == "object" && typeof opt_c == "undefined") {
          text1 = /** @type {string} */
          a;
          diffs = /** @type {!Array.<!diff_match_patch.Diff>} */
          opt_b;
        } else if (typeof a == "string" && typeof opt_b == "string" && opt_c && typeof opt_c == "object") {
          text1 = /** @type {string} */
          a;
          diffs = /** @type {!Array.<!diff_match_patch.Diff>} */
          opt_c;
        } else {
          throw new Error("Unknown call format to patch_make.");
        }
        if (diffs.length === 0) {
          return [];
        }
        var patches = [];
        var patch = new diff_match_patch.patch_obj();
        var patchDiffLength = 0;
        var char_count1 = 0;
        var char_count2 = 0;
        var prepatch_text = text1;
        var postpatch_text = text1;
        for (var x = 0; x < diffs.length; x++) {
          var diff_type = diffs[x][0];
          var diff_text = diffs[x][1];
          if (!patchDiffLength && diff_type !== DIFF_EQUAL) {
            patch.start1 = char_count1;
            patch.start2 = char_count2;
          }
          switch (diff_type) {
            case DIFF_INSERT:
              patch.diffs[patchDiffLength++] = diffs[x];
              patch.length2 += diff_text.length;
              postpatch_text = postpatch_text.substring(0, char_count2) + diff_text + postpatch_text.substring(char_count2);
              break;
            case DIFF_DELETE:
              patch.length1 += diff_text.length;
              patch.diffs[patchDiffLength++] = diffs[x];
              postpatch_text = postpatch_text.substring(0, char_count2) + postpatch_text.substring(char_count2 + diff_text.length);
              break;
            case DIFF_EQUAL:
              if (diff_text.length <= 2 * this.Patch_Margin && patchDiffLength && diffs.length != x + 1) {
                patch.diffs[patchDiffLength++] = diffs[x];
                patch.length1 += diff_text.length;
                patch.length2 += diff_text.length;
              } else if (diff_text.length >= 2 * this.Patch_Margin) {
                if (patchDiffLength) {
                  this.patch_addContext_(patch, prepatch_text);
                  patches.push(patch);
                  patch = new diff_match_patch.patch_obj();
                  patchDiffLength = 0;
                  prepatch_text = postpatch_text;
                  char_count1 = char_count2;
                }
              }
              break;
          }
          if (diff_type !== DIFF_INSERT) {
            char_count1 += diff_text.length;
          }
          if (diff_type !== DIFF_DELETE) {
            char_count2 += diff_text.length;
          }
        }
        if (patchDiffLength) {
          this.patch_addContext_(patch, prepatch_text);
          patches.push(patch);
        }
        return patches;
      };
      diff_match_patch.prototype.patch_deepCopy = function(patches) {
        var patchesCopy = [];
        for (var x = 0; x < patches.length; x++) {
          var patch = patches[x];
          var patchCopy = new diff_match_patch.patch_obj();
          patchCopy.diffs = [];
          for (var y = 0; y < patch.diffs.length; y++) {
            patchCopy.diffs[y] = new diff_match_patch.Diff(patch.diffs[y][0], patch.diffs[y][1]);
          }
          patchCopy.start1 = patch.start1;
          patchCopy.start2 = patch.start2;
          patchCopy.length1 = patch.length1;
          patchCopy.length2 = patch.length2;
          patchesCopy[x] = patchCopy;
        }
        return patchesCopy;
      };
      diff_match_patch.prototype.patch_apply = function(patches, text2) {
        if (patches.length == 0) {
          return [text2, []];
        }
        patches = this.patch_deepCopy(patches);
        var nullPadding = this.patch_addPadding(patches);
        text2 = nullPadding + text2 + nullPadding;
        this.patch_splitMax(patches);
        var delta = 0;
        var results = [];
        for (var x = 0; x < patches.length; x++) {
          var expected_loc = patches[x].start2 + delta;
          var text1 = this.diff_text1(patches[x].diffs);
          var start_loc;
          var end_loc = -1;
          if (text1.length > this.Match_MaxBits) {
            start_loc = this.match_main(
              text2,
              text1.substring(0, this.Match_MaxBits),
              expected_loc
            );
            if (start_loc != -1) {
              end_loc = this.match_main(
                text2,
                text1.substring(text1.length - this.Match_MaxBits),
                expected_loc + text1.length - this.Match_MaxBits
              );
              if (end_loc == -1 || start_loc >= end_loc) {
                start_loc = -1;
              }
            }
          } else {
            start_loc = this.match_main(text2, text1, expected_loc);
          }
          if (start_loc == -1) {
            results[x] = false;
            delta -= patches[x].length2 - patches[x].length1;
          } else {
            results[x] = true;
            delta = start_loc - expected_loc;
            var text22;
            if (end_loc == -1) {
              text22 = text2.substring(start_loc, start_loc + text1.length);
            } else {
              text22 = text2.substring(start_loc, end_loc + this.Match_MaxBits);
            }
            if (text1 == text22) {
              text2 = text2.substring(0, start_loc) + this.diff_text2(patches[x].diffs) + text2.substring(start_loc + text1.length);
            } else {
              var diffs = this.diff_main(text1, text22, false);
              if (text1.length > this.Match_MaxBits && this.diff_levenshtein(diffs) / text1.length > this.Patch_DeleteThreshold) {
                results[x] = false;
              } else {
                this.diff_cleanupSemanticLossless(diffs);
                var index1 = 0;
                var index2;
                for (var y = 0; y < patches[x].diffs.length; y++) {
                  var mod2 = patches[x].diffs[y];
                  if (mod2[0] !== DIFF_EQUAL) {
                    index2 = this.diff_xIndex(diffs, index1);
                  }
                  if (mod2[0] === DIFF_INSERT) {
                    text2 = text2.substring(0, start_loc + index2) + mod2[1] + text2.substring(start_loc + index2);
                  } else if (mod2[0] === DIFF_DELETE) {
                    text2 = text2.substring(0, start_loc + index2) + text2.substring(start_loc + this.diff_xIndex(
                      diffs,
                      index1 + mod2[1].length
                    ));
                  }
                  if (mod2[0] !== DIFF_DELETE) {
                    index1 += mod2[1].length;
                  }
                }
              }
            }
          }
        }
        text2 = text2.substring(nullPadding.length, text2.length - nullPadding.length);
        return [text2, results];
      };
      diff_match_patch.prototype.patch_addPadding = function(patches) {
        var paddingLength = this.Patch_Margin;
        var nullPadding = "";
        for (var x = 1; x <= paddingLength; x++) {
          nullPadding += String.fromCharCode(x);
        }
        for (var x = 0; x < patches.length; x++) {
          patches[x].start1 += paddingLength;
          patches[x].start2 += paddingLength;
        }
        var patch = patches[0];
        var diffs = patch.diffs;
        if (diffs.length == 0 || diffs[0][0] != DIFF_EQUAL) {
          diffs.unshift(new diff_match_patch.Diff(DIFF_EQUAL, nullPadding));
          patch.start1 -= paddingLength;
          patch.start2 -= paddingLength;
          patch.length1 += paddingLength;
          patch.length2 += paddingLength;
        } else if (paddingLength > diffs[0][1].length) {
          var extraLength = paddingLength - diffs[0][1].length;
          diffs[0][1] = nullPadding.substring(diffs[0][1].length) + diffs[0][1];
          patch.start1 -= extraLength;
          patch.start2 -= extraLength;
          patch.length1 += extraLength;
          patch.length2 += extraLength;
        }
        patch = patches[patches.length - 1];
        diffs = patch.diffs;
        if (diffs.length == 0 || diffs[diffs.length - 1][0] != DIFF_EQUAL) {
          diffs.push(new diff_match_patch.Diff(DIFF_EQUAL, nullPadding));
          patch.length1 += paddingLength;
          patch.length2 += paddingLength;
        } else if (paddingLength > diffs[diffs.length - 1][1].length) {
          var extraLength = paddingLength - diffs[diffs.length - 1][1].length;
          diffs[diffs.length - 1][1] += nullPadding.substring(0, extraLength);
          patch.length1 += extraLength;
          patch.length2 += extraLength;
        }
        return nullPadding;
      };
      diff_match_patch.prototype.patch_splitMax = function(patches) {
        var patch_size = this.Match_MaxBits;
        for (var x = 0; x < patches.length; x++) {
          if (patches[x].length1 <= patch_size) {
            continue;
          }
          var bigpatch = patches[x];
          patches.splice(x--, 1);
          var start1 = bigpatch.start1;
          var start2 = bigpatch.start2;
          var precontext = "";
          while (bigpatch.diffs.length !== 0) {
            var patch = new diff_match_patch.patch_obj();
            var empty = true;
            patch.start1 = start1 - precontext.length;
            patch.start2 = start2 - precontext.length;
            if (precontext !== "") {
              patch.length1 = patch.length2 = precontext.length;
              patch.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL, precontext));
            }
            while (bigpatch.diffs.length !== 0 && patch.length1 < patch_size - this.Patch_Margin) {
              var diff_type = bigpatch.diffs[0][0];
              var diff_text = bigpatch.diffs[0][1];
              if (diff_type === DIFF_INSERT) {
                patch.length2 += diff_text.length;
                start2 += diff_text.length;
                patch.diffs.push(bigpatch.diffs.shift());
                empty = false;
              } else if (diff_type === DIFF_DELETE && patch.diffs.length == 1 && patch.diffs[0][0] == DIFF_EQUAL && diff_text.length > 2 * patch_size) {
                patch.length1 += diff_text.length;
                start1 += diff_text.length;
                empty = false;
                patch.diffs.push(new diff_match_patch.Diff(diff_type, diff_text));
                bigpatch.diffs.shift();
              } else {
                diff_text = diff_text.substring(
                  0,
                  patch_size - patch.length1 - this.Patch_Margin
                );
                patch.length1 += diff_text.length;
                start1 += diff_text.length;
                if (diff_type === DIFF_EQUAL) {
                  patch.length2 += diff_text.length;
                  start2 += diff_text.length;
                } else {
                  empty = false;
                }
                patch.diffs.push(new diff_match_patch.Diff(diff_type, diff_text));
                if (diff_text == bigpatch.diffs[0][1]) {
                  bigpatch.diffs.shift();
                } else {
                  bigpatch.diffs[0][1] = bigpatch.diffs[0][1].substring(diff_text.length);
                }
              }
            }
            precontext = this.diff_text2(patch.diffs);
            precontext = precontext.substring(precontext.length - this.Patch_Margin);
            var postcontext = this.diff_text1(bigpatch.diffs).substring(0, this.Patch_Margin);
            if (postcontext !== "") {
              patch.length1 += postcontext.length;
              patch.length2 += postcontext.length;
              if (patch.diffs.length !== 0 && patch.diffs[patch.diffs.length - 1][0] === DIFF_EQUAL) {
                patch.diffs[patch.diffs.length - 1][1] += postcontext;
              } else {
                patch.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL, postcontext));
              }
            }
            if (!empty) {
              patches.splice(++x, 0, patch);
            }
          }
        }
      };
      diff_match_patch.prototype.patch_toText = function(patches) {
        var text2 = [];
        for (var x = 0; x < patches.length; x++) {
          text2[x] = patches[x];
        }
        return text2.join("");
      };
      diff_match_patch.prototype.patch_fromText = function(textline) {
        var patches = [];
        if (!textline) {
          return patches;
        }
        var text2 = textline.split("\n");
        var textPointer = 0;
        var patchHeader = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/;
        while (textPointer < text2.length) {
          var m = text2[textPointer].match(patchHeader);
          if (!m) {
            throw new Error("Invalid patch string: " + text2[textPointer]);
          }
          var patch = new diff_match_patch.patch_obj();
          patches.push(patch);
          patch.start1 = parseInt(m[1], 10);
          if (m[2] === "") {
            patch.start1--;
            patch.length1 = 1;
          } else if (m[2] == "0") {
            patch.length1 = 0;
          } else {
            patch.start1--;
            patch.length1 = parseInt(m[2], 10);
          }
          patch.start2 = parseInt(m[3], 10);
          if (m[4] === "") {
            patch.start2--;
            patch.length2 = 1;
          } else if (m[4] == "0") {
            patch.length2 = 0;
          } else {
            patch.start2--;
            patch.length2 = parseInt(m[4], 10);
          }
          textPointer++;
          while (textPointer < text2.length) {
            var sign = text2[textPointer].charAt(0);
            try {
              var line = decodeURI(text2[textPointer].substring(1));
            } catch (ex) {
              throw new Error("Illegal escape in patch_fromText: " + line);
            }
            if (sign == "-") {
              patch.diffs.push(new diff_match_patch.Diff(DIFF_DELETE, line));
            } else if (sign == "+") {
              patch.diffs.push(new diff_match_patch.Diff(DIFF_INSERT, line));
            } else if (sign == " ") {
              patch.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL, line));
            } else if (sign == "@") {
              break;
            } else if (sign === "") {
            } else {
              throw new Error('Invalid patch mode "' + sign + '" in: ' + line);
            }
            textPointer++;
          }
        }
        return patches;
      };
      diff_match_patch.patch_obj = function() {
        this.diffs = [];
        this.start1 = null;
        this.start2 = null;
        this.length1 = 0;
        this.length2 = 0;
      };
      diff_match_patch.patch_obj.prototype.toString = function() {
        var coords1, coords2;
        if (this.length1 === 0) {
          coords1 = this.start1 + ",0";
        } else if (this.length1 == 1) {
          coords1 = this.start1 + 1;
        } else {
          coords1 = this.start1 + 1 + "," + this.length1;
        }
        if (this.length2 === 0) {
          coords2 = this.start2 + ",0";
        } else if (this.length2 == 1) {
          coords2 = this.start2 + 1;
        } else {
          coords2 = this.start2 + 1 + "," + this.length2;
        }
        var text2 = ["@@ -" + coords1 + " +" + coords2 + " @@\n"];
        var op;
        for (var x = 0; x < this.diffs.length; x++) {
          switch (this.diffs[x][0]) {
            case DIFF_INSERT:
              op = "+";
              break;
            case DIFF_DELETE:
              op = "-";
              break;
            case DIFF_EQUAL:
              op = " ";
              break;
          }
          text2[x + 1] = op + encodeURI(this.diffs[x][1]) + "\n";
        }
        return text2.join("").replace(/%20/g, " ");
      };
      module.exports = diff_match_patch;
      module.exports["diff_match_patch"] = diff_match_patch;
      module.exports["DIFF_DELETE"] = DIFF_DELETE;
      module.exports["DIFF_INSERT"] = DIFF_INSERT;
      module.exports["DIFF_EQUAL"] = DIFF_EQUAL;
    }
  });

  // ../protocol/dist/canonical.js
  var textEncoder = new TextEncoder();
  var textDecoder = new TextDecoder();
  var toHex = (bytes) => {
    let out = "";
    for (const byte of bytes)
      out += byte.toString(16).padStart(2, "0");
    return out;
  };
  var fromHex = (text2) => {
    if (text2.length % 2 !== 0)
      throw new Error("hex con longitud impar");
    const out = new Uint8Array(text2.length / 2);
    for (let i = 0; i < out.length; i += 1) {
      const pair = text2.slice(i * 2, i * 2 + 2);
      if (!/^[0-9a-fA-F]{2}$/.test(pair))
        throw new Error(`hex inv\xE1lido: ${pair}`);
      out[i] = Number.parseInt(pair, 16);
    }
    return out;
  };
  var B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var B64_DECODE = (() => {
    const table = new Int16Array(128).fill(-1);
    for (let i = 0; i < B64_ALPHABET.length; i += 1)
      table[B64_ALPHABET.charCodeAt(i)] = i;
    return table;
  })();
  var b64CharValue = (text2, index) => {
    const code = text2.charCodeAt(index);
    const value = code < 128 ? B64_DECODE[code] : -1;
    if (value < 0)
      throw new Error(`base64 inv\xE1lido: car\xE1cter en posici\xF3n ${index}`);
    return value;
  };
  var b64Encode = (bytes) => {
    let out = "";
    const len = bytes.length;
    for (let i = 0; i < len; i += 3) {
      const b0 = bytes[i];
      const has1 = i + 1 < len;
      const has2 = i + 2 < len;
      const b1 = has1 ? bytes[i + 1] : 0;
      const b2 = has2 ? bytes[i + 2] : 0;
      out += B64_ALPHABET[b0 >> 2];
      out += B64_ALPHABET[(b0 & 3) << 4 | b1 >> 4];
      out += has1 ? B64_ALPHABET[(b1 & 15) << 2 | b2 >> 6] : "=";
      out += has2 ? B64_ALPHABET[b2 & 63] : "=";
    }
    return out;
  };
  var b64Decode = (text2) => {
    if (text2.length % 4 !== 0)
      throw new Error("base64 inv\xE1lido: longitud no m\xFAltiplo de 4");
    const out = [];
    for (let i = 0; i < text2.length; i += 4) {
      const last = i + 4 === text2.length;
      const c0 = b64CharValue(text2, i);
      const c1 = b64CharValue(text2, i + 1);
      const p2 = text2[i + 2];
      const p3 = text2[i + 3];
      if (!last && (p2 === "=" || p3 === "=")) {
        throw new Error("base64 inv\xE1lido: padding fuera del final");
      }
      if (p2 === "=" && p3 !== "=")
        throw new Error("base64 inv\xE1lido: padding incompleto");
      out.push(c0 << 2 | c1 >> 4);
      if (p2 !== "=") {
        const c2 = b64CharValue(text2, i + 2);
        out.push((c1 & 15) << 4 | c2 >> 2);
        if (p3 !== "=") {
          const c3 = b64CharValue(text2, i + 3);
          out.push((c2 & 3) << 6 | c3);
        } else if ((c2 & 3) !== 0) {
          throw new Error("base64 inv\xE1lido: bits de padding en cero requeridos");
        }
      } else if ((c1 & 15) !== 0) {
        throw new Error("base64 inv\xE1lido: bits de padding en cero requeridos");
      }
    }
    return Uint8Array.from(out);
  };

  // ../protocol/dist/messages.js
  var OP_ADD = 1;
  var OP_MOD = 2;
  var OP_DEL = 3;
  var OP_MOVE = 4;
  var SIGN_OP_ADD = 0;
  var SIGN_OP_MOD = 1;
  var SIGN_OP_DEL = 2;
  var SIGN_OP_MOVE = 3;
  var signOpCode = (op) => {
    switch (op) {
      case "add":
        return SIGN_OP_ADD;
      case "mod":
        return SIGN_OP_MOD;
      case "del":
        return SIGN_OP_DEL;
      case "move":
        return SIGN_OP_MOVE;
    }
  };
  var OP_WIRE_BY_CODE = {
    [OP_ADD]: "add",
    [OP_MOD]: "mod",
    [OP_DEL]: "del",
    [OP_MOVE]: "move"
  };

  // ../../node_modules/@noble/ciphers/utils.js
  function isBytes(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
  }
  var atitle = (title) => title ? `"${title}" ` : "";
  function abool(value, title = "") {
    if (typeof value !== "boolean")
      throw new TypeError(atitle(title) + "expected boolean, got type=" + typeof value);
    return value;
  }
  function anumber(n, title = "") {
    if (typeof n !== "number")
      throw new TypeError(atitle(title) + "expected number, got " + typeof n);
    if (!Number.isSafeInteger(n) || n < 0)
      throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
    return n;
  }
  function abytes(value, length, title = "") {
    if (isBytes(value) && (length === void 0 || value.length === length))
      return value;
    if (length !== void 0)
      anumber(length, "length");
    const bytes = isBytes(value);
    const ofLen = length !== void 0 ? ` of length ${length}` : "";
    const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
    const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
    if (!bytes)
      throw new TypeError(message);
    throw new RangeError(message);
  }
  var aobject = (value, label) => {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new TypeError(label === "object" ? "expected valid options object" : `"${label}" expected object, got type=${typeof value}`);
  };
  function aexists(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("hash was destroyed");
    if (checkFinished && instance.finished)
      throw new Error("digest() was already called");
  }
  function aoutput(out, instance) {
    abytes(out, void 0, "output");
    const min = instance.outputLen;
    if (!(out.length >= min)) {
      throw new RangeError('"output" expected length >= ' + min);
    }
  }
  function u32(arr) {
    return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
  }
  function clean(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
  function byteSwap(word) {
    return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
  }
  function byteSwap32(arr) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = byteSwap(arr[i]);
    }
    return arr;
  }
  var swap32IfBE = isLE ? (u) => u : byteSwap32;
  function overlapBytes(a, b) {
    if (!a.byteLength || !b.byteLength)
      return false;
    return a.buffer === b.buffer && // best we can do, may fail with an obscure Proxy
    a.byteOffset < b.byteOffset + b.byteLength && // a starts before b end
    b.byteOffset < a.byteOffset + a.byteLength;
  }
  function complexOverlapBytes(input, output) {
    if (overlapBytes(input, output) && input.byteOffset < output.byteOffset)
      throw new Error("complex overlap of input and output is not supported");
  }
  function checkOpts(defaults, opts) {
    aobject(defaults, "defaults");
    aobject(opts, "opts");
    const merged = Object.assign(defaults, opts);
    return merged;
  }
  function equalBytes(a, b) {
    a = abytes(a);
    b = abytes(b);
    if (a.length !== b.length)
      return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
      diff |= a[i] ^ b[i];
    return diff === 0;
  }
  function wrapMacConstructor(keyLen, macCons, fromMsg) {
    const mac = macCons;
    const getArgs = fromMsg || (() => []);
    const macC = (msg, key) => mac(key, ...getArgs(msg)).update(msg).digest();
    const tmp = mac(new Uint8Array(keyLen), ...getArgs(new Uint8Array(0)));
    macC.outputLen = tmp.outputLen;
    macC.blockLen = tmp.blockLen;
    macC.create = (key, ...args) => mac(key, ...args);
    return macC;
  }
  var wrapCipher = /* @__NO_SIDE_EFFECTS__ */ (params, constructor) => {
    function wrappedCipher(key, ...args) {
      abytes(key, void 0, "key");
      if (params.nonceLength !== void 0) {
        const nonce = args[0];
        abytes(nonce, params.varSizeNonce ? void 0 : params.nonceLength, "nonce");
      }
      const tagl = params.tagLength;
      const aadStart = params.nonceLength !== void 0 ? 1 : 0;
      if (!params.withAAD) {
        for (let i = aadStart; i < args.length; i++)
          if (isBytes(args[i]))
            throw new Error("AAD not supported");
      }
      if (params.withAAD && args[aadStart] !== void 0)
        abytes(args[aadStart], void 0, "AAD");
      const cipher = constructor(key, ...args);
      const checkOutput = (fnLength, output) => {
        if (output !== void 0) {
          if (fnLength !== 2)
            throw new Error("cipher output not supported");
          abytes(output, void 0, "output");
        }
      };
      let called = false;
      const wrCipher = {
        encrypt(data, output) {
          if (called)
            throw new Error("cannot encrypt() twice with same key + nonce");
          called = true;
          abytes(data, void 0, "data");
          checkOutput(cipher.encrypt.length, output);
          return cipher.encrypt(data, output);
        },
        decrypt(data, output) {
          abytes(data, void 0, "data");
          if (tagl && data.length < tagl)
            throw new Error('"ciphertext" expected length >= tagLength=' + tagl);
          checkOutput(cipher.decrypt.length, output);
          return cipher.decrypt(data, output);
        }
      };
      return wrCipher;
    }
    Object.assign(wrappedCipher, params);
    return wrappedCipher;
  };
  function getOutput(expectedLength, out, onlyAligned = true) {
    if (out === void 0)
      return new Uint8Array(expectedLength);
    abytes(out, expectedLength, "output");
    if (onlyAligned && !isAligned32(out))
      throw new Error("invalid output, must be aligned");
    return out;
  }
  function u64Lengths(dataLength, aadLength, isLE3) {
    anumber(dataLength);
    anumber(aadLength);
    abool(isLE3);
    const num = new Uint8Array(16);
    const view = createView(num);
    view.setBigUint64(0, BigInt(aadLength), isLE3);
    view.setBigUint64(8, BigInt(dataLength), isLE3);
    return num;
  }
  function isAligned32(bytes) {
    return bytes.byteOffset % 4 === 0;
  }
  function copyBytes(bytes) {
    return Uint8Array.from(abytes(bytes));
  }

  // ../../node_modules/@noble/ciphers/_arx.js
  var encodeStr = (str) => Uint8Array.from(str.split(""), (c) => c.charCodeAt(0));
  var sigma16_32 = /* @__PURE__ */ (() => swap32IfBE(u32(encodeStr("expand 16-byte k"))))();
  var sigma32_32 = /* @__PURE__ */ (() => swap32IfBE(u32(encodeStr("expand 32-byte k"))))();
  function rotl(a, b) {
    return a << b | a >>> 32 - b;
  }
  var BLOCK_LEN = 64;
  var BLOCK_LEN32 = 16;
  var MAX_COUNTER = /* @__PURE__ */ (() => 2 ** 32 - 1)();
  var U32_EMPTY = /* @__PURE__ */ Uint32Array.of();
  function runCipher(core, sigma, key, nonce, data, output, counter, rounds) {
    const len = data.length;
    const block2 = new Uint8Array(BLOCK_LEN);
    const b32 = u32(block2);
    const isAligned = isLE && isAligned32(data) && isAligned32(output);
    const d32 = isAligned ? u32(data) : U32_EMPTY;
    const o32 = isAligned ? u32(output) : U32_EMPTY;
    if (!isLE) {
      for (let pos = 0; pos < len; counter++) {
        core(sigma, key, nonce, b32, counter, rounds);
        swap32IfBE(b32);
        if (counter >= MAX_COUNTER)
          throw new Error("arx: counter overflow");
        const take = Math.min(BLOCK_LEN, len - pos);
        for (let j = 0, posj; j < take; j++) {
          posj = pos + j;
          output[posj] = data[posj] ^ block2[j];
        }
        pos += take;
      }
      return;
    }
    for (let pos = 0; pos < len; counter++) {
      core(sigma, key, nonce, b32, counter, rounds);
      if (counter >= MAX_COUNTER)
        throw new Error("arx: counter overflow");
      const take = Math.min(BLOCK_LEN, len - pos);
      if (isAligned && take === BLOCK_LEN) {
        const pos32 = pos / 4;
        if (pos % 4 !== 0)
          throw new Error("arx: invalid block position");
        for (let j = 0, posj; j < BLOCK_LEN32; j++) {
          posj = pos32 + j;
          o32[posj] = d32[posj] ^ b32[j];
        }
        pos += BLOCK_LEN;
        continue;
      }
      for (let j = 0, posj; j < take; j++) {
        posj = pos + j;
        output[posj] = data[posj] ^ block2[j];
      }
      pos += take;
    }
  }
  function createCipher(core, opts) {
    const { allowShortKeys, extendNonceFn, counterLength, counterRight, rounds } = checkOpts({ allowShortKeys: false, counterLength: 8, counterRight: false, rounds: 20 }, opts);
    if (typeof core !== "function")
      throw new Error("core must be a function");
    anumber(counterLength);
    anumber(rounds);
    abool(counterRight);
    abool(allowShortKeys);
    return (key, nonce, data, output, counter = 0) => {
      abytes(key, void 0, "key");
      abytes(nonce, void 0, "nonce");
      abytes(data, void 0, "data");
      const len = data.length;
      const hasOutput = output !== void 0;
      output = getOutput(len, output, false);
      if (hasOutput)
        complexOverlapBytes(data, output);
      anumber(counter);
      if (counter < 0 || counter >= MAX_COUNTER)
        throw new Error("arx: counter overflow");
      const toClean = [];
      let l = key.length;
      let k;
      let sigma;
      if (l === 32) {
        toClean.push(k = copyBytes(key));
        sigma = sigma32_32;
      } else if (l === 16 && allowShortKeys) {
        k = new Uint8Array(32);
        k.set(key);
        k.set(key, 16);
        sigma = sigma16_32;
        toClean.push(k);
      } else {
        abytes(key, 32, "arx key");
        throw new Error("invalid key size");
      }
      if (!isLE || !isAligned32(nonce))
        toClean.push(nonce = copyBytes(nonce));
      let k32 = u32(k);
      if (extendNonceFn) {
        if (nonce.length !== 24)
          throw new Error("arx: extended nonce must be 24 bytes");
        const n16 = nonce.subarray(0, 16);
        if (isLE)
          extendNonceFn(sigma, k32, u32(n16), k32);
        else {
          const sigmaRaw = swap32IfBE(Uint32Array.from(sigma));
          extendNonceFn(sigmaRaw, k32, u32(n16), k32);
          clean(sigmaRaw);
          swap32IfBE(k32);
        }
        nonce = nonce.subarray(16);
      } else if (!isLE)
        swap32IfBE(k32);
      const nonceNcLen = 16 - counterLength;
      if (nonceNcLen !== nonce.length)
        throw new Error(`arx: nonce must be ${nonceNcLen} or 16 bytes`);
      if (nonceNcLen !== 12) {
        const nc = new Uint8Array(12);
        nc.set(nonce, counterRight ? 0 : 12 - nonce.length);
        nonce = nc;
        toClean.push(nonce);
      }
      const n32 = swap32IfBE(u32(nonce));
      try {
        runCipher(core, sigma, k32, n32, data, output, counter, rounds);
        return output;
      } finally {
        clean(...toClean);
      }
    };
  }

  // ../../node_modules/@noble/ciphers/_poly1305.js
  function u8to16(a, i) {
    return a[i++] & 255 | (a[i++] & 255) << 8;
  }
  var Poly1305 = class {
    blockLen = 16;
    outputLen = 16;
    buffer = new Uint8Array(16);
    r = new Uint16Array(10);
    // Allocating 1 array with .subarray() here is slower than 3
    h = new Uint16Array(10);
    pad = new Uint16Array(8);
    pos = 0;
    finished = false;
    destroyed = false;
    // Can be speed-up using BigUint64Array, at the cost of complexity
    constructor(key) {
      key = copyBytes(abytes(key, 32, "key"));
      const t0 = u8to16(key, 0);
      const t1 = u8to16(key, 2);
      const t2 = u8to16(key, 4);
      const t3 = u8to16(key, 6);
      const t4 = u8to16(key, 8);
      const t5 = u8to16(key, 10);
      const t6 = u8to16(key, 12);
      const t7 = u8to16(key, 14);
      this.r[0] = t0 & 8191;
      this.r[1] = (t0 >>> 13 | t1 << 3) & 8191;
      this.r[2] = (t1 >>> 10 | t2 << 6) & 7939;
      this.r[3] = (t2 >>> 7 | t3 << 9) & 8191;
      this.r[4] = (t3 >>> 4 | t4 << 12) & 255;
      this.r[5] = t4 >>> 1 & 8190;
      this.r[6] = (t4 >>> 14 | t5 << 2) & 8191;
      this.r[7] = (t5 >>> 11 | t6 << 5) & 8065;
      this.r[8] = (t6 >>> 8 | t7 << 8) & 8191;
      this.r[9] = t7 >>> 5 & 127;
      for (let i = 0; i < 8; i++)
        this.pad[i] = u8to16(key, 16 + 2 * i);
    }
    process(data, offset, isLast = false) {
      const hibit = isLast ? 0 : 1 << 11;
      const { h, r } = this;
      const r0 = r[0];
      const r1 = r[1];
      const r2 = r[2];
      const r3 = r[3];
      const r4 = r[4];
      const r5 = r[5];
      const r6 = r[6];
      const r7 = r[7];
      const r8 = r[8];
      const r9 = r[9];
      const t0 = u8to16(data, offset + 0);
      const t1 = u8to16(data, offset + 2);
      const t2 = u8to16(data, offset + 4);
      const t3 = u8to16(data, offset + 6);
      const t4 = u8to16(data, offset + 8);
      const t5 = u8to16(data, offset + 10);
      const t6 = u8to16(data, offset + 12);
      const t7 = u8to16(data, offset + 14);
      let h0 = h[0] + (t0 & 8191);
      let h1 = h[1] + ((t0 >>> 13 | t1 << 3) & 8191);
      let h2 = h[2] + ((t1 >>> 10 | t2 << 6) & 8191);
      let h3 = h[3] + ((t2 >>> 7 | t3 << 9) & 8191);
      let h4 = h[4] + ((t3 >>> 4 | t4 << 12) & 8191);
      let h5 = h[5] + (t4 >>> 1 & 8191);
      let h6 = h[6] + ((t4 >>> 14 | t5 << 2) & 8191);
      let h7 = h[7] + ((t5 >>> 11 | t6 << 5) & 8191);
      let h8 = h[8] + ((t6 >>> 8 | t7 << 8) & 8191);
      let h9 = h[9] + (t7 >>> 5 | hibit);
      let c = 0;
      let d0 = c + h0 * r0 + h1 * (5 * r9) + h2 * (5 * r8) + h3 * (5 * r7) + h4 * (5 * r6);
      c = d0 >>> 13;
      d0 &= 8191;
      d0 += h5 * (5 * r5) + h6 * (5 * r4) + h7 * (5 * r3) + h8 * (5 * r2) + h9 * (5 * r1);
      c += d0 >>> 13;
      d0 &= 8191;
      let d1 = c + h0 * r1 + h1 * r0 + h2 * (5 * r9) + h3 * (5 * r8) + h4 * (5 * r7);
      c = d1 >>> 13;
      d1 &= 8191;
      d1 += h5 * (5 * r6) + h6 * (5 * r5) + h7 * (5 * r4) + h8 * (5 * r3) + h9 * (5 * r2);
      c += d1 >>> 13;
      d1 &= 8191;
      let d2 = c + h0 * r2 + h1 * r1 + h2 * r0 + h3 * (5 * r9) + h4 * (5 * r8);
      c = d2 >>> 13;
      d2 &= 8191;
      d2 += h5 * (5 * r7) + h6 * (5 * r6) + h7 * (5 * r5) + h8 * (5 * r4) + h9 * (5 * r3);
      c += d2 >>> 13;
      d2 &= 8191;
      let d3 = c + h0 * r3 + h1 * r2 + h2 * r1 + h3 * r0 + h4 * (5 * r9);
      c = d3 >>> 13;
      d3 &= 8191;
      d3 += h5 * (5 * r8) + h6 * (5 * r7) + h7 * (5 * r6) + h8 * (5 * r5) + h9 * (5 * r4);
      c += d3 >>> 13;
      d3 &= 8191;
      let d4 = c + h0 * r4 + h1 * r3 + h2 * r2 + h3 * r1 + h4 * r0;
      c = d4 >>> 13;
      d4 &= 8191;
      d4 += h5 * (5 * r9) + h6 * (5 * r8) + h7 * (5 * r7) + h8 * (5 * r6) + h9 * (5 * r5);
      c += d4 >>> 13;
      d4 &= 8191;
      let d5 = c + h0 * r5 + h1 * r4 + h2 * r3 + h3 * r2 + h4 * r1;
      c = d5 >>> 13;
      d5 &= 8191;
      d5 += h5 * r0 + h6 * (5 * r9) + h7 * (5 * r8) + h8 * (5 * r7) + h9 * (5 * r6);
      c += d5 >>> 13;
      d5 &= 8191;
      let d6 = c + h0 * r6 + h1 * r5 + h2 * r4 + h3 * r3 + h4 * r2;
      c = d6 >>> 13;
      d6 &= 8191;
      d6 += h5 * r1 + h6 * r0 + h7 * (5 * r9) + h8 * (5 * r8) + h9 * (5 * r7);
      c += d6 >>> 13;
      d6 &= 8191;
      let d7 = c + h0 * r7 + h1 * r6 + h2 * r5 + h3 * r4 + h4 * r3;
      c = d7 >>> 13;
      d7 &= 8191;
      d7 += h5 * r2 + h6 * r1 + h7 * r0 + h8 * (5 * r9) + h9 * (5 * r8);
      c += d7 >>> 13;
      d7 &= 8191;
      let d8 = c + h0 * r8 + h1 * r7 + h2 * r6 + h3 * r5 + h4 * r4;
      c = d8 >>> 13;
      d8 &= 8191;
      d8 += h5 * r3 + h6 * r2 + h7 * r1 + h8 * r0 + h9 * (5 * r9);
      c += d8 >>> 13;
      d8 &= 8191;
      let d9 = c + h0 * r9 + h1 * r8 + h2 * r7 + h3 * r6 + h4 * r5;
      c = d9 >>> 13;
      d9 &= 8191;
      d9 += h5 * r4 + h6 * r3 + h7 * r2 + h8 * r1 + h9 * r0;
      c += d9 >>> 13;
      d9 &= 8191;
      c = (c << 2) + c | 0;
      c = c + d0 | 0;
      d0 = c & 8191;
      c = c >>> 13;
      d1 += c;
      h[0] = d0;
      h[1] = d1;
      h[2] = d2;
      h[3] = d3;
      h[4] = d4;
      h[5] = d5;
      h[6] = d6;
      h[7] = d7;
      h[8] = d8;
      h[9] = d9;
    }
    finalize() {
      const { h, pad } = this;
      const g = new Uint16Array(10);
      let c = h[1] >>> 13;
      h[1] &= 8191;
      for (let i = 2; i < 10; i++) {
        h[i] += c;
        c = h[i] >>> 13;
        h[i] &= 8191;
      }
      h[0] += c * 5;
      c = h[0] >>> 13;
      h[0] &= 8191;
      h[1] += c;
      c = h[1] >>> 13;
      h[1] &= 8191;
      h[2] += c;
      g[0] = h[0] + 5;
      c = g[0] >>> 13;
      g[0] &= 8191;
      for (let i = 1; i < 10; i++) {
        g[i] = h[i] + c;
        c = g[i] >>> 13;
        g[i] &= 8191;
      }
      g[9] -= 1 << 13;
      let mask = (c ^ 1) - 1;
      for (let i = 0; i < 10; i++)
        g[i] &= mask;
      mask = ~mask;
      for (let i = 0; i < 10; i++)
        h[i] = h[i] & mask | g[i];
      h[0] = (h[0] | h[1] << 13) & 65535;
      h[1] = (h[1] >>> 3 | h[2] << 10) & 65535;
      h[2] = (h[2] >>> 6 | h[3] << 7) & 65535;
      h[3] = (h[3] >>> 9 | h[4] << 4) & 65535;
      h[4] = (h[4] >>> 12 | h[5] << 1 | h[6] << 14) & 65535;
      h[5] = (h[6] >>> 2 | h[7] << 11) & 65535;
      h[6] = (h[7] >>> 5 | h[8] << 8) & 65535;
      h[7] = (h[8] >>> 8 | h[9] << 5) & 65535;
      let f = h[0] + pad[0];
      h[0] = f & 65535;
      for (let i = 1; i < 8; i++) {
        f = (h[i] + pad[i] | 0) + (f >>> 16) | 0;
        h[i] = f & 65535;
      }
      clean(g);
    }
    update(data) {
      aexists(this);
      abytes(data);
      data = copyBytes(data);
      const { buffer, blockLen } = this;
      const len = data.length;
      for (let pos = 0; pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
        if (take === blockLen) {
          for (; blockLen <= len - pos; pos += blockLen)
            this.process(data, pos);
          continue;
        }
        buffer.set(data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        pos += take;
        if (this.pos === blockLen) {
          this.process(buffer, 0, false);
          this.pos = 0;
        }
      }
      return this;
    }
    destroy() {
      this.destroyed = true;
      clean(this.h, this.r, this.buffer, this.pad);
    }
    digestInto(out) {
      aexists(this);
      aoutput(out, this);
      this.finished = true;
      const { buffer, h } = this;
      let { pos } = this;
      if (pos) {
        buffer[pos++] = 1;
        for (; pos < 16; pos++)
          buffer[pos] = 0;
        this.process(buffer, 0, true);
      }
      this.finalize();
      let opos = 0;
      for (let i = 0; i < 8; i++) {
        out[opos++] = h[i] >>> 0;
        out[opos++] = h[i] >>> 8;
      }
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
      const res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
  };
  var poly1305 = /* @__PURE__ */ wrapMacConstructor(32, (key) => new Poly1305(key));

  // ../../node_modules/@noble/ciphers/chacha.js
  function chachaCore(s, k, n, out, cnt, rounds = 20) {
    let y00 = s[0], y01 = s[1], y02 = s[2], y03 = s[3], y04 = k[0], y05 = k[1], y06 = k[2], y07 = k[3], y08 = k[4], y09 = k[5], y10 = k[6], y11 = k[7], y12 = cnt, y13 = n[0], y14 = n[1], y15 = n[2];
    let x00 = y00, x01 = y01, x02 = y02, x03 = y03, x04 = y04, x05 = y05, x06 = y06, x07 = y07, x08 = y08, x09 = y09, x10 = y10, x11 = y11, x12 = y12, x13 = y13, x14 = y14, x15 = y15;
    for (let r = 0; r < rounds; r += 2) {
      x00 = x00 + x04 | 0;
      x12 = rotl(x12 ^ x00, 16);
      x08 = x08 + x12 | 0;
      x04 = rotl(x04 ^ x08, 12);
      x00 = x00 + x04 | 0;
      x12 = rotl(x12 ^ x00, 8);
      x08 = x08 + x12 | 0;
      x04 = rotl(x04 ^ x08, 7);
      x01 = x01 + x05 | 0;
      x13 = rotl(x13 ^ x01, 16);
      x09 = x09 + x13 | 0;
      x05 = rotl(x05 ^ x09, 12);
      x01 = x01 + x05 | 0;
      x13 = rotl(x13 ^ x01, 8);
      x09 = x09 + x13 | 0;
      x05 = rotl(x05 ^ x09, 7);
      x02 = x02 + x06 | 0;
      x14 = rotl(x14 ^ x02, 16);
      x10 = x10 + x14 | 0;
      x06 = rotl(x06 ^ x10, 12);
      x02 = x02 + x06 | 0;
      x14 = rotl(x14 ^ x02, 8);
      x10 = x10 + x14 | 0;
      x06 = rotl(x06 ^ x10, 7);
      x03 = x03 + x07 | 0;
      x15 = rotl(x15 ^ x03, 16);
      x11 = x11 + x15 | 0;
      x07 = rotl(x07 ^ x11, 12);
      x03 = x03 + x07 | 0;
      x15 = rotl(x15 ^ x03, 8);
      x11 = x11 + x15 | 0;
      x07 = rotl(x07 ^ x11, 7);
      x00 = x00 + x05 | 0;
      x15 = rotl(x15 ^ x00, 16);
      x10 = x10 + x15 | 0;
      x05 = rotl(x05 ^ x10, 12);
      x00 = x00 + x05 | 0;
      x15 = rotl(x15 ^ x00, 8);
      x10 = x10 + x15 | 0;
      x05 = rotl(x05 ^ x10, 7);
      x01 = x01 + x06 | 0;
      x12 = rotl(x12 ^ x01, 16);
      x11 = x11 + x12 | 0;
      x06 = rotl(x06 ^ x11, 12);
      x01 = x01 + x06 | 0;
      x12 = rotl(x12 ^ x01, 8);
      x11 = x11 + x12 | 0;
      x06 = rotl(x06 ^ x11, 7);
      x02 = x02 + x07 | 0;
      x13 = rotl(x13 ^ x02, 16);
      x08 = x08 + x13 | 0;
      x07 = rotl(x07 ^ x08, 12);
      x02 = x02 + x07 | 0;
      x13 = rotl(x13 ^ x02, 8);
      x08 = x08 + x13 | 0;
      x07 = rotl(x07 ^ x08, 7);
      x03 = x03 + x04 | 0;
      x14 = rotl(x14 ^ x03, 16);
      x09 = x09 + x14 | 0;
      x04 = rotl(x04 ^ x09, 12);
      x03 = x03 + x04 | 0;
      x14 = rotl(x14 ^ x03, 8);
      x09 = x09 + x14 | 0;
      x04 = rotl(x04 ^ x09, 7);
    }
    let oi = 0;
    out[oi++] = y00 + x00 | 0;
    out[oi++] = y01 + x01 | 0;
    out[oi++] = y02 + x02 | 0;
    out[oi++] = y03 + x03 | 0;
    out[oi++] = y04 + x04 | 0;
    out[oi++] = y05 + x05 | 0;
    out[oi++] = y06 + x06 | 0;
    out[oi++] = y07 + x07 | 0;
    out[oi++] = y08 + x08 | 0;
    out[oi++] = y09 + x09 | 0;
    out[oi++] = y10 + x10 | 0;
    out[oi++] = y11 + x11 | 0;
    out[oi++] = y12 + x12 | 0;
    out[oi++] = y13 + x13 | 0;
    out[oi++] = y14 + x14 | 0;
    out[oi++] = y15 + x15 | 0;
  }
  function hchacha(s, k, i, out) {
    const s2 = isLE ? s : swap32IfBE(s.slice(0, 4));
    const k2 = isLE ? k : swap32IfBE(k.slice(0, 8));
    const i2 = isLE ? i : swap32IfBE(i.slice(0, 4));
    const t = new Uint32Array(16);
    chachaCore(s2, k2, i2.subarray(1), t, i2[0]);
    let oi = 0;
    out[oi++] = t[0] - s2[0] | 0;
    out[oi++] = t[1] - s2[1] | 0;
    out[oi++] = t[2] - s2[2] | 0;
    out[oi++] = t[3] - s2[3] | 0;
    out[oi++] = t[12] - i2[0] | 0;
    out[oi++] = t[13] - i2[1] | 0;
    out[oi++] = t[14] - i2[2] | 0;
    out[oi++] = t[15] - i2[3] | 0;
    swap32IfBE(out);
    if (!isLE)
      clean(s2, k2, i2);
    clean(t);
  }
  var xchacha20 = /* @__PURE__ */ createCipher(chachaCore, {
    counterRight: false,
    counterLength: 8,
    extendNonceFn: hchacha,
    allowShortKeys: false
  });
  var ZEROS16 = /* @__PURE__ */ new Uint8Array(16);
  var updatePadded = (h, msg) => {
    h.update(msg);
    const leftover = msg.length % 16;
    if (leftover)
      h.update(ZEROS16.subarray(leftover));
  };
  var ZEROS32 = /* @__PURE__ */ new Uint8Array(32);
  function computeTag(fn, key, nonce, ciphertext, AAD) {
    if (AAD !== void 0)
      abytes(AAD, void 0, "AAD");
    const authKey = fn(key, nonce, ZEROS32);
    const lengths = u64Lengths(ciphertext.length, AAD ? AAD.length : 0, true);
    const h = poly1305.create(authKey);
    if (AAD)
      updatePadded(h, AAD);
    updatePadded(h, ciphertext);
    h.update(lengths);
    const res = h.digest();
    clean(authKey, lengths);
    return res;
  }
  var _poly1305_aead = (xorStream) => (key, nonce, AAD) => {
    const tagLength = 16;
    return {
      encrypt(plaintext, output) {
        const plength = plaintext.length;
        output = getOutput(plength + tagLength, output, false);
        output.set(plaintext);
        const oPlain = output.subarray(0, -tagLength);
        xorStream(key, nonce, oPlain, oPlain, 1);
        const tag = computeTag(xorStream, key, nonce, oPlain, AAD);
        output.set(tag, plength);
        clean(tag);
        return output;
      },
      decrypt(ciphertext, output) {
        output = getOutput(ciphertext.length - tagLength, output, false);
        const data = ciphertext.subarray(0, -tagLength);
        const passedTag = ciphertext.subarray(-tagLength);
        const tag = computeTag(xorStream, key, nonce, data, AAD);
        if (!equalBytes(passedTag, tag)) {
          clean(tag);
          throw new Error("invalid tag");
        }
        output.set(ciphertext.subarray(0, -tagLength));
        xorStream(key, nonce, output, output, 1);
        clean(tag);
        return output;
      }
    };
  };
  var xchacha20poly1305 = /* @__PURE__ */ wrapCipher(
    { blockSize: 64, nonceLength: 24, tagLength: 16, withAAD: true },
    /* @__PURE__ */ _poly1305_aead(xchacha20)
  );

  // ../../node_modules/@noble/hashes/_u64.js
  var U32_MASK64 = /* @__PURE__ */ (() => BigInt(2 ** 32 - 1))();
  var _32n = /* @__PURE__ */ BigInt(32);
  function fromBig(n, le = false) {
    if (le)
      return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
    return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
  }
  function split(lst, le = false) {
    const len = lst.length;
    let Ah = new Uint32Array(len);
    let Al = new Uint32Array(len);
    for (let i = 0; i < len; i++) {
      const { h, l } = fromBig(lst[i], le);
      [Ah[i], Al[i]] = [h, l];
    }
    return [Ah, Al];
  }
  var fromNumH = (n) => n / 2 ** 32 | 0;
  var fromNumL = (n) => n >>> 0;
  function setU64FromNum(view, byteOffset, n, isLE3) {
    const h = fromNumH(n);
    const l = fromNumL(n);
    view.setUint32(byteOffset, isLE3 ? l : h, isLE3);
    view.setUint32(byteOffset + 4, isLE3 ? h : l, isLE3);
  }
  var shrSH = (h, _l, s) => h >>> s;
  var shrSL = (h, l, s) => h << 32 - s | l >>> s;
  var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
  var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
  var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
  var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
  var rotr32H = (_h, l) => l;
  var rotr32L = (h, _l) => h;
  function add(Ah, Al, Bh, Bl) {
    const l = (Al >>> 0) + (Bl >>> 0);
    return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
  }
  var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
  var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
  var add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
  var add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
  var add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
  var add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;

  // ../../node_modules/@noble/hashes/utils.js
  function isBytes2(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
  }
  var atitle2 = (title) => title ? `"${title}" ` : "";
  function anumber2(n, title = "") {
    if (typeof n !== "number")
      throw new TypeError(atitle2(title) + "expected number, got " + typeof n);
    if (!Number.isSafeInteger(n) || n < 0)
      throw new RangeError(atitle2(title) + "expected integer >= 0, got " + n);
    return n;
  }
  function abytes2(value, length, title = "") {
    if (isBytes2(value) && (length === void 0 || value.length === length))
      return value;
    if (length !== void 0)
      anumber2(length, "length");
    const bytes = isBytes2(value);
    const ofLen = length !== void 0 ? ` of length ${length}` : "";
    const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
    const message = atitle2(title) + "expected Uint8Array" + ofLen + ", got " + got;
    if (!bytes)
      throw new TypeError(message);
    throw new RangeError(message);
  }
  function copyBytes2(bytes) {
    return Uint8Array.from(abytes2(bytes));
  }
  function ahash(h) {
    if (typeof h !== "function" || typeof h.create !== "function")
      throw new TypeError("expected hash wrapped by utils.createHasher");
    anumber2(h.outputLen);
    anumber2(h.blockLen);
    if (h.outputLen < 1 || h.blockLen < 1)
      throw new Error("hash blockLen / outputLen must be >= 1");
  }
  var aobject2 = (value, label) => {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
  };
  var aopts = (value, label) => {
    aobject2(value, label);
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null)
      throw new TypeError(`"${label}" expected plain object`);
    if (Object.hasOwn(value, "__proto__"))
      throw new TypeError(`"${label}.__proto__" is not allowed`);
  };
  function aexists2(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("hash was destroyed");
    if (checkFinished && instance.finished)
      throw new Error("digest() was already called");
  }
  function aoutput2(out, instance) {
    abytes2(out, void 0, "output");
    const min = instance.outputLen;
    if (!(out.length >= min)) {
      throw new RangeError('"output" expected length >= ' + min);
    }
  }
  function u8(arr) {
    return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  function u322(arr) {
    return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
  }
  function clean2(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView2(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  function rotr(word, shift) {
    return word << 32 - shift | word >>> shift;
  }
  var isLE2 = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
  function byteSwap2(word) {
    return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
  }
  var swap8IfBE = isLE2 ? (n) => n : (n) => byteSwap2(n) >>> 0;
  function byteSwap322(arr) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = byteSwap2(arr[i]);
    }
    return arr;
  }
  var swap32IfBE2 = isLE2 ? (u) => u : byteSwap322;
  var hasHexBuiltin = /* @__PURE__ */ (() => (
    // @ts-ignore
    typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
  ))();
  var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
  function bytesToHex(bytes) {
    abytes2(bytes);
    if (hasHexBuiltin)
      return bytes.toHex();
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += hexes[bytes[i]];
    }
    return hex;
  }
  function asciiToBase16(ch) {
    return ch >= 48 && ch <= 57 ? ch - 48 : ch >= 65 && ch <= 70 ? ch - (65 - 10) : ch >= 97 && ch <= 102 ? ch - (97 - 10) : void 0;
  }
  function hexToBytes(hex) {
    if (typeof hex !== "string")
      throw new TypeError("hex string expected, got " + typeof hex);
    if (hasHexBuiltin) {
      try {
        return Uint8Array.fromHex(hex);
      } catch (error) {
        if (error instanceof SyntaxError)
          throw new RangeError(error.message);
        throw error;
      }
    }
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2)
      throw new RangeError("hex string expected, got unpadded hex of length " + hl);
    const array = new Uint8Array(al);
    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
      const n1 = asciiToBase16(hex.charCodeAt(hi));
      const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
      if (n1 === void 0 || n2 === void 0) {
        const char = hex[hi] + hex[hi + 1];
        throw new RangeError('hex string expected, got non-hex character "' + char + '" at index ' + hi);
      }
      array[ai] = n1 * 16 + n2;
    }
    return array;
  }
  function utf8ToBytes(str) {
    if (typeof str !== "string")
      throw new TypeError("string expected");
    const encoded = new TextEncoder().encode(str);
    try {
      return new Uint8Array(encoded);
    } finally {
      clean2(encoded);
    }
  }
  function kdfInputToBytes(data, errorTitle = "") {
    if (typeof data === "string")
      return utf8ToBytes(data);
    return abytes2(data, void 0, errorTitle);
  }
  function concatBytes(...arrays) {
    let sum = 0;
    for (let i = 0; i < arrays.length; i++) {
      const a = arrays[i];
      abytes2(a);
      sum += a.length;
    }
    const res = new Uint8Array(sum);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
      const a = arrays[i];
      res.set(a, pad);
      pad += a.length;
    }
    return res;
  }
  function checkOpts2(defaults, opts, title = "opts") {
    aopts(defaults, "defaults");
    if (opts !== void 0)
      aopts(opts, title);
    const merged = Object.assign(/* @__PURE__ */ Object.create(null), defaults, opts);
    return merged;
  }
  function createHasher(hashCons, info = {}) {
    if (typeof hashCons !== "function")
      throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
    info = checkOpts2({}, info, "info");
    const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
    const tmp = hashCons(void 0);
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.canXOF = tmp.canXOF;
    hashC.create = (opts) => hashCons(opts);
    Object.assign(hashC, info);
    return Object.freeze(hashC);
  }
  function randomBytes2(bytesLength = 32) {
    anumber2(bytesLength, "bytesLength");
    const cr = typeof globalThis === "object" ? globalThis.crypto : null;
    if (typeof cr?.getRandomValues !== "function")
      throw new Error("crypto.getRandomValues must be defined");
    if (bytesLength > 65536)
      throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
    return cr.getRandomValues(new Uint8Array(bytesLength));
  }
  var oidNist = (suffix) => ({
    // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
    // Larger suffix values would need base-128 OID encoding and a different length byte.
    oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
  });

  // ../../node_modules/@noble/hashes/_md.js
  function Chi(a, b, c) {
    return a & b ^ ~a & c;
  }
  function Maj(a, b, c) {
    return a & b ^ a & c ^ b & c;
  }
  var HashMD = class {
    blockLen;
    outputLen;
    canXOF = false;
    padOffset;
    isLE;
    // For partial updates less than block size
    buffer;
    view;
    finished = false;
    length = 0;
    pos = 0;
    destroyed = false;
    constructor(blockLen, outputLen, padOffset, isLE3) {
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.padOffset = padOffset;
      this.isLE = isLE3;
      this.buffer = new Uint8Array(blockLen);
      this.view = createView2(this.buffer);
    }
    update(data) {
      aexists2(this);
      abytes2(data);
      const { view, buffer, blockLen } = this;
      const len = data.length;
      let processed = false;
      for (let pos = 0; pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
        if (take === blockLen) {
          const dataView = createView2(data);
          for (; blockLen <= len - pos; pos += blockLen)
            this.process(dataView, pos);
          processed = true;
          continue;
        }
        buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        pos += take;
        if (this.pos === blockLen) {
          this.process(view, 0);
          this.pos = 0;
          processed = true;
        }
      }
      this.length += data.length;
      if (processed)
        this.roundClean();
      return this;
    }
    digestInto(out) {
      aexists2(this);
      aoutput2(out, this);
      this.finished = true;
      const { buffer, view, blockLen, isLE: isLE3 } = this;
      let { pos } = this;
      buffer[pos++] = 128;
      buffer.fill(0, pos);
      if (this.padOffset > blockLen - pos) {
        this.process(view, 0);
        buffer.fill(0);
      }
      setU64FromNum(view, blockLen - 8, this.length * 8, isLE3);
      this.process(view, 0);
      this.roundClean();
      const oview = out === buffer ? view : createView2(out);
      const len = this.outputLen;
      const outLen = len / 4;
      const state = this.get();
      if (len % 4 || outLen > state.length)
        throw new Error("invalid outputLen");
      for (let i = 0; i < outLen; i++)
        oview.setUint32(4 * i, state[i], isLE3);
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
      const res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
    _cloneIntoMeta(to) {
      const { buffer, length, finished, destroyed, pos } = this;
      to.destroyed = destroyed;
      to.finished = finished;
      to.length = length;
      to.pos = pos;
      if (pos)
        to.buffer.set(buffer);
      return to;
    }
    clone() {
      return this._cloneInto();
    }
  };
  var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  var SHA512_IV = /* @__PURE__ */ Uint32Array.from([
    1779033703,
    4089235720,
    3144134277,
    2227873595,
    1013904242,
    4271175723,
    2773480762,
    1595750129,
    1359893119,
    2917565137,
    2600822924,
    725511199,
    528734635,
    4215389547,
    1541459225,
    327033209
  ]);

  // ../../node_modules/@noble/hashes/sha2.js
  var SHA256_K = /* @__PURE__ */ Uint32Array.from([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
  var SHA2_32B = class extends HashMD {
    // We cannot use array here since array allows indexing by variable
    // which means optimizer/compiler cannot use registers.
    // Numeric initializers matter: starting the fields as `undefined` changes
    // V8's field representation and makes sha256 3x slower (measured).
    A = 0;
    B = 0;
    C = 0;
    D = 0;
    E = 0;
    F = 0;
    G = 0;
    H = 0;
    constructor(outputLen, IV) {
      super(64, outputLen, 8, false);
      this.A = IV[0] | 0;
      this.B = IV[1] | 0;
      this.C = IV[2] | 0;
      this.D = IV[3] | 0;
      this.E = IV[4] | 0;
      this.F = IV[5] | 0;
      this.G = IV[6] | 0;
      this.H = IV[7] | 0;
    }
    get() {
      const { A, B, C, D, E, F, G: G2, H } = this;
      return [A, B, C, D, E, F, G2, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G2, H) {
      this.A = A | 0;
      this.B = B | 0;
      this.C = C | 0;
      this.D = D | 0;
      this.E = E | 0;
      this.F = F | 0;
      this.G = G2 | 0;
      this.H = H | 0;
    }
    _cloneInto(to) {
      (to ||= new this.constructor()).set(...this.get());
      return this._cloneIntoMeta(to);
    }
    process(view, offset) {
      for (let i = 0; i < 16; i++, offset += 4)
        SHA256_W[i] = view.getUint32(offset, false);
      for (let i = 16; i < 64; i++) {
        const W15 = SHA256_W[i - 15];
        const W2 = SHA256_W[i - 2];
        const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
        const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
        SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
      }
      let { A, B, C, D, E, F, G: G2, H } = this;
      for (let i = 0; i < 64; i++) {
        const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
        const T1 = H + sigma1 + Chi(E, F, G2) + SHA256_K[i] + SHA256_W[i] | 0;
        const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
        const T2 = sigma0 + Maj(A, B, C) | 0;
        H = G2;
        G2 = F;
        F = E;
        E = D + T1 | 0;
        D = C;
        C = B;
        B = A;
        A = T1 + T2 | 0;
      }
      A = A + this.A | 0;
      B = B + this.B | 0;
      C = C + this.C | 0;
      D = D + this.D | 0;
      E = E + this.E | 0;
      F = F + this.F | 0;
      G2 = G2 + this.G | 0;
      H = H + this.H | 0;
      this.set(A, B, C, D, E, F, G2, H);
    }
    roundClean() {
      clean2(SHA256_W);
    }
    destroy() {
      this.destroyed = true;
      this.set(0, 0, 0, 0, 0, 0, 0, 0);
      clean2(this.buffer);
    }
  };
  var _SHA256 = class extends SHA2_32B {
    constructor() {
      super(32, SHA256_IV);
    }
  };
  var K512 = /* @__PURE__ */ (() => split([
    "0x428a2f98d728ae22",
    "0x7137449123ef65cd",
    "0xb5c0fbcfec4d3b2f",
    "0xe9b5dba58189dbbc",
    "0x3956c25bf348b538",
    "0x59f111f1b605d019",
    "0x923f82a4af194f9b",
    "0xab1c5ed5da6d8118",
    "0xd807aa98a3030242",
    "0x12835b0145706fbe",
    "0x243185be4ee4b28c",
    "0x550c7dc3d5ffb4e2",
    "0x72be5d74f27b896f",
    "0x80deb1fe3b1696b1",
    "0x9bdc06a725c71235",
    "0xc19bf174cf692694",
    "0xe49b69c19ef14ad2",
    "0xefbe4786384f25e3",
    "0x0fc19dc68b8cd5b5",
    "0x240ca1cc77ac9c65",
    "0x2de92c6f592b0275",
    "0x4a7484aa6ea6e483",
    "0x5cb0a9dcbd41fbd4",
    "0x76f988da831153b5",
    "0x983e5152ee66dfab",
    "0xa831c66d2db43210",
    "0xb00327c898fb213f",
    "0xbf597fc7beef0ee4",
    "0xc6e00bf33da88fc2",
    "0xd5a79147930aa725",
    "0x06ca6351e003826f",
    "0x142929670a0e6e70",
    "0x27b70a8546d22ffc",
    "0x2e1b21385c26c926",
    "0x4d2c6dfc5ac42aed",
    "0x53380d139d95b3df",
    "0x650a73548baf63de",
    "0x766a0abb3c77b2a8",
    "0x81c2c92e47edaee6",
    "0x92722c851482353b",
    "0xa2bfe8a14cf10364",
    "0xa81a664bbc423001",
    "0xc24b8b70d0f89791",
    "0xc76c51a30654be30",
    "0xd192e819d6ef5218",
    "0xd69906245565a910",
    "0xf40e35855771202a",
    "0x106aa07032bbd1b8",
    "0x19a4c116b8d2d0c8",
    "0x1e376c085141ab53",
    "0x2748774cdf8eeb99",
    "0x34b0bcb5e19b48a8",
    "0x391c0cb3c5c95a63",
    "0x4ed8aa4ae3418acb",
    "0x5b9cca4f7763e373",
    "0x682e6ff3d6b2b8a3",
    "0x748f82ee5defb2fc",
    "0x78a5636f43172f60",
    "0x84c87814a1f0ab72",
    "0x8cc702081a6439ec",
    "0x90befffa23631e28",
    "0xa4506cebde82bde9",
    "0xbef9a3f7b2c67915",
    "0xc67178f2e372532b",
    "0xca273eceea26619c",
    "0xd186b8c721c0c207",
    "0xeada7dd6cde0eb1e",
    "0xf57d4f7fee6ed178",
    "0x06f067aa72176fba",
    "0x0a637dc5a2c898a6",
    "0x113f9804bef90dae",
    "0x1b710b35131c471b",
    "0x28db77f523047d84",
    "0x32caab7b40c72493",
    "0x3c9ebe0a15c9bebc",
    "0x431d67c49c100d4c",
    "0x4cc5d4becb3e42b6",
    "0x597f299cfc657e2a",
    "0x5fcb6fab3ad6faec",
    "0x6c44198c4a475817"
  ].map((n) => BigInt(n))))();
  var SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
  var SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
  var SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
  var SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
  var SHA2_64B = class extends HashMD {
    // We cannot use array here since array allows indexing by variable
    // which means optimizer/compiler cannot use registers.
    // h -- high 32 bits, l -- low 32 bits
    // Numeric initializers matter: starting the fields as `undefined` changes
    // V8's field representation and slows hashing down (measured on sha256).
    Ah = 0;
    Al = 0;
    Bh = 0;
    Bl = 0;
    Ch = 0;
    Cl = 0;
    Dh = 0;
    Dl = 0;
    Eh = 0;
    El = 0;
    Fh = 0;
    Fl = 0;
    Gh = 0;
    Gl = 0;
    Hh = 0;
    Hl = 0;
    constructor(outputLen, IV) {
      super(128, outputLen, 16, false);
      this.Ah = IV[0] | 0;
      this.Al = IV[1] | 0;
      this.Bh = IV[2] | 0;
      this.Bl = IV[3] | 0;
      this.Ch = IV[4] | 0;
      this.Cl = IV[5] | 0;
      this.Dh = IV[6] | 0;
      this.Dl = IV[7] | 0;
      this.Eh = IV[8] | 0;
      this.El = IV[9] | 0;
      this.Fh = IV[10] | 0;
      this.Fl = IV[11] | 0;
      this.Gh = IV[12] | 0;
      this.Gl = IV[13] | 0;
      this.Hh = IV[14] | 0;
      this.Hl = IV[15] | 0;
    }
    // prettier-ignore
    get() {
      const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
      return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
    }
    // prettier-ignore
    set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
      this.Ah = Ah | 0;
      this.Al = Al | 0;
      this.Bh = Bh | 0;
      this.Bl = Bl | 0;
      this.Ch = Ch | 0;
      this.Cl = Cl | 0;
      this.Dh = Dh | 0;
      this.Dl = Dl | 0;
      this.Eh = Eh | 0;
      this.El = El | 0;
      this.Fh = Fh | 0;
      this.Fl = Fl | 0;
      this.Gh = Gh | 0;
      this.Gl = Gl | 0;
      this.Hh = Hh | 0;
      this.Hl = Hl | 0;
    }
    _cloneInto(to) {
      (to ||= new this.constructor()).set(...this.get());
      return this._cloneIntoMeta(to);
    }
    process(view, offset) {
      for (let i = 0; i < 16; i++, offset += 4) {
        SHA512_W_H[i] = view.getUint32(offset);
        SHA512_W_L[i] = view.getUint32(offset += 4);
      }
      for (let i = 16; i < 80; i++) {
        const W15h = SHA512_W_H[i - 15] | 0;
        const W15l = SHA512_W_L[i - 15] | 0;
        const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
        const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
        const W2h = SHA512_W_H[i - 2] | 0;
        const W2l = SHA512_W_L[i - 2] | 0;
        const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
        const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
        const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
        const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
        SHA512_W_H[i] = SUMh | 0;
        SHA512_W_L[i] = SUMl | 0;
      }
      let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
      for (let i = 0; i < 80; i++) {
        const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
        const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
        const CHIh = Eh & Fh ^ ~Eh & Gh;
        const CHIl = El & Fl ^ ~El & Gl;
        const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
        const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
        const T1l = T1ll | 0;
        const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
        const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
        const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
        const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
        Hh = Gh | 0;
        Hl = Gl | 0;
        Gh = Fh | 0;
        Gl = Fl | 0;
        Fh = Eh | 0;
        Fl = El | 0;
        ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
        Dh = Ch | 0;
        Dl = Cl | 0;
        Ch = Bh | 0;
        Cl = Bl | 0;
        Bh = Ah | 0;
        Bl = Al | 0;
        const All = add3L(T1l, sigma0l, MAJl);
        Ah = add3H(All, T1h, sigma0h, MAJh);
        Al = All | 0;
      }
      ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
      ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
      ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
      ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
      ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
      ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
      ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
      ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
      this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
    }
    roundClean() {
      clean2(SHA512_W_H, SHA512_W_L);
    }
    destroy() {
      this.destroyed = true;
      clean2(this.buffer);
      this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
  };
  var _SHA512 = class extends SHA2_64B {
    constructor() {
      super(64, SHA512_IV);
    }
  };
  var sha256 = /* @__PURE__ */ createHasher(
    () => new _SHA256(),
    /* @__PURE__ */ oidNist(1)
  );
  var sha512 = /* @__PURE__ */ createHasher(
    () => new _SHA512(),
    /* @__PURE__ */ oidNist(3)
  );

  // ../../node_modules/@noble/curves/utils.js
  function aarray(item, title, inner = () => {
  }) {
    if (!Array.isArray(item))
      throw new TypeError(`"${title}" expected array, got type=${typeof item}`);
    for (let i = 0; i < item.length; i++)
      inner(item[i], `${title}[${i}]`);
    return item;
  }
  var abytes3 = (value, length, title) => abytes2(value, length, title);
  var anumber3 = anumber2;
  function aobject3(value, title = "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new TypeError(title === "object" ? "expected valid options object" : `"${title}" expected object, got type=${typeof value}`);
    return value;
  }
  function afunction(value, title) {
    if (typeof value !== "function")
      throw new TypeError(`"${title}" is invalid: expected function, got ${typeof value}`);
    return value;
  }
  var bytesToHex2 = bytesToHex;
  var concatBytes2 = (...arrays) => concatBytes(...arrays);
  var hexToBytes2 = (hex) => hexToBytes(hex);
  var isBytes3 = isBytes2;
  var randomBytes3 = (bytesLength) => randomBytes2(bytesLength);
  var _0n = /* @__PURE__ */ BigInt(0);
  var _1n = /* @__PURE__ */ BigInt(1);
  var atitle3 = (title) => title ? `"${title}" ` : "";
  function abool2(value, title = "") {
    if (typeof value !== "boolean")
      throw new TypeError(atitle3(title) + "expected boolean, got type=" + typeof value);
    return value;
  }
  function abignumber(n) {
    if (typeof n === "bigint") {
      if (!isPosBig(n))
        throw new RangeError("positive bigint expected, got " + n);
    } else
      anumber3(n);
    return n;
  }
  function asafenumber(value, title = "") {
    if (typeof value !== "number") {
      const prefix = title && `"${title}" `;
      throw new TypeError(prefix + "expected number, got type=" + typeof value);
    }
    if (!Number.isSafeInteger(value)) {
      const prefix = title && `"${title}" `;
      throw new RangeError(prefix + "expected safe integer, got " + value);
    }
  }
  function hexToNumber(hex) {
    if (typeof hex !== "string")
      throw new TypeError("hex string expected, got " + typeof hex);
    return hex === "" ? _0n : BigInt("0x" + hex);
  }
  function bytesToNumberBE(bytes) {
    return hexToNumber(bytesToHex(bytes));
  }
  function bytesToNumberLE(bytes) {
    return hexToNumber(bytesToHex(copyBytes3(abytes2(bytes)).reverse()));
  }
  function numberToBytesBE(n, len) {
    anumber2(len);
    if (len === 0)
      throw new Error("zero output length is invalid");
    n = abignumber(n);
    const expectedLen = len * 2;
    const hex = n.toString(16);
    if (hex.length > expectedLen)
      throw new RangeError("number is too large");
    return hexToBytes(hex.padStart(expectedLen, "0"));
  }
  function numberToBytesLE(n, len) {
    return numberToBytesBE(n, len).reverse();
  }
  function copyBytes3(bytes) {
    return Uint8Array.from(abytes3(bytes));
  }
  function isPosBig(n) {
    return typeof n === "bigint" && _0n <= n;
  }
  function inRange(n, min, max) {
    return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
  }
  function aInRange(title, n, min, max) {
    if (!inRange(n, min, max))
      throw new RangeError("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
  }
  function bitLen(n) {
    if (n < _0n)
      throw new Error("expected non-negative bigint, got " + n);
    return n === _0n ? 0 : n.toString(2).length;
  }
  var bitMask = (n) => {
    asafenumber(n, "n");
    return (_1n << BigInt(n)) - _1n;
  };
  function validateObject(object, fields = {}, optFields = {}, title = "object") {
    aobject3(object, title);
    aobject3(fields, "fields");
    aobject3(optFields, "optFields");
    function checkField(fieldName, expectedType, isOpt) {
      const label = title === "object" ? `param "${String(fieldName)}"` : `"${title}.${String(fieldName)}"`;
      const val = object[fieldName];
      if (!Object.hasOwn(object, fieldName) && (isOpt ? val !== void 0 : expectedType !== "function")) {
        throw new TypeError(`${label} is invalid: expected own property`);
      }
      if (isOpt && val === void 0)
        return;
      const current = typeof val;
      if (current !== expectedType || val === null)
        throw new TypeError(`${label} is invalid: expected ${expectedType}, got ${current}`);
    }
    const iter = (f, isOpt) => Object.entries(f).forEach(([k, v]) => checkField(k, v, isOpt));
    iter(fields, false);
    iter(optFields, true);
  }

  // ../../node_modules/@noble/curves/abstract/modular.js
  var _0n2 = /* @__PURE__ */ BigInt(0);
  var _1n2 = /* @__PURE__ */ BigInt(1);
  var _2n = /* @__PURE__ */ BigInt(2);
  var _3n = /* @__PURE__ */ BigInt(3);
  var _4n = /* @__PURE__ */ BigInt(4);
  var _5n = /* @__PURE__ */ BigInt(5);
  var _7n = /* @__PURE__ */ BigInt(7);
  var _8n = /* @__PURE__ */ BigInt(8);
  var _9n = /* @__PURE__ */ BigInt(9);
  var _15n = /* @__PURE__ */ BigInt(15);
  var _16n = /* @__PURE__ */ BigInt(16);
  var POW_WINDOWED_MIN = /* @__PURE__ */ BigInt("0x10000000000000000");
  function mod(a, b) {
    if (b <= _0n2)
      throw new Error("mod: expected positive modulus, got " + b);
    const result = a % b;
    return result >= _0n2 ? result : b + result;
  }
  function pow(num, power, modulo) {
    if (modulo <= _1n2)
      throw new Error("pow: expected modulus > 1, got " + modulo);
    if (typeof power !== "bigint")
      throw new TypeError("invalid exponent: expected bigint, got " + typeof power);
    if (power < _0n2)
      throw new Error("invalid exponent, negatives unsupported");
    if (power === _0n2)
      return _1n2;
    if (power === _1n2)
      return num;
    let d = num % modulo;
    if (d < _0n2)
      d += modulo;
    if (power < POW_WINDOWED_MIN) {
      let p2 = _1n2;
      while (power > _0n2) {
        if (power & _1n2)
          p2 = p2 * d % modulo;
        d = d * d % modulo;
        power >>= _1n2;
      }
      return p2;
    }
    const digits = [];
    while (power > _0n2) {
      digits.push(Number(power & _15n));
      power >>= _4n;
    }
    const table = new Array(16);
    table[0] = _1n2;
    table[1] = d;
    for (let i = 2; i < 16; i++)
      table[i] = table[i - 1] * d % modulo;
    let p = table[digits[digits.length - 1]];
    for (let w = digits.length - 2; w >= 0; w--) {
      p = p * p % modulo;
      p = p * p % modulo;
      p = p * p % modulo;
      p = p * p % modulo;
      const digit = digits[w];
      if (digit !== 0)
        p = p * table[digit] % modulo;
    }
    return p;
  }
  function pow2(x, power, modulo) {
    if (modulo <= _1n2)
      throw new Error("pow2: expected modulus > 1, got " + modulo);
    if (power < _0n2)
      throw new Error("pow2: expected non-negative exponent, got " + power);
    let res = x;
    while (power-- > _0n2) {
      res *= res;
      res %= modulo;
    }
    return res;
  }
  function invert(number, modulo) {
    if (number === _0n2)
      throw new Error("invert: expected non-zero number");
    if (modulo <= _1n2)
      throw new Error("invert: expected modulus > 1, got " + modulo);
    let a = mod(number, modulo);
    let b = modulo;
    let x = _0n2, u = _1n2;
    while (a !== _0n2) {
      const q = b / a;
      const r = b - a * q;
      const m = x - u * q;
      b = a, a = r, x = u, u = m;
    }
    const gcd = b;
    if (gcd !== _1n2)
      throw new Error("invert: does not exist");
    return mod(x, modulo);
  }
  function assertIsSquare(Fp2, root, n) {
    const F = Fp2;
    if (!F.eql(F.sqr(root), n))
      throw new Error("Cannot find square root");
  }
  function aoddModulus(order, fnName) {
    if ((order & _1n2) === _0n2)
      throw new Error(fnName + ": expected odd modulus, got " + order);
  }
  function sqrt3mod4(Fp2, n) {
    const F = Fp2;
    const p1div4 = (F.ORDER + _1n2) / _4n;
    const root = F.pow(n, p1div4);
    assertIsSquare(F, root, n);
    return root;
  }
  function sqrt5mod8(Fp2, n) {
    const F = Fp2;
    const p5div8 = (F.ORDER - _5n) / _8n;
    const n2 = F.mul(n, _2n);
    const v = F.pow(n2, p5div8);
    const nv = F.mul(n, v);
    const i = F.mul(F.mul(nv, _2n), v);
    const root = F.mul(nv, F.sub(i, F.ONE));
    assertIsSquare(F, root, n);
    return root;
  }
  function sqrt9mod16(P2) {
    const Fp_ = Field(P2);
    const tn = tonelliShanks(P2);
    const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
    const c2 = tn(Fp_, c1);
    const c3 = tn(Fp_, Fp_.neg(c1));
    const c4 = (P2 + _7n) / _16n;
    return ((Fp2, n) => {
      const F = Fp2;
      let tv1 = F.pow(n, c4);
      let tv2 = F.mul(tv1, c1);
      const tv3 = F.mul(tv1, c2);
      const tv4 = F.mul(tv1, c3);
      const e1 = F.eql(F.sqr(tv2), n);
      const e2 = F.eql(F.sqr(tv3), n);
      tv1 = F.cmov(tv1, tv2, e1);
      tv2 = F.cmov(tv4, tv3, e2);
      const e3 = F.eql(F.sqr(tv2), n);
      const root = F.cmov(tv1, tv2, e3);
      assertIsSquare(F, root, n);
      return root;
    });
  }
  function tonelliShanks(P2) {
    if (P2 < _3n)
      throw new Error("sqrt is not defined for small field");
    aoddModulus(P2, "tonelliShanks");
    let Q = P2 - _1n2;
    let S = 0;
    while (Q % _2n === _0n2) {
      Q /= _2n;
      S++;
    }
    let Z = _2n;
    const _Fp = Field(P2);
    while (FpLegendre(_Fp, Z) === 1) {
      if (Z++ > 1e3)
        throw new Error("Cannot find square root: probably non-prime P");
    }
    if (S === 1)
      return sqrt3mod4;
    let cc = _Fp.pow(Z, Q);
    const Q1div2 = (Q + _1n2) / _2n;
    return function tonelliSlow(Fp2, n) {
      const F = Fp2;
      if (F.is0(n))
        return n;
      if (FpLegendre(F, n) !== 1)
        throw new Error("Cannot find square root");
      let M = S;
      let c = F.mul(F.ONE, cc);
      let t = F.pow(n, Q);
      let R = F.pow(n, Q1div2);
      while (!F.eql(t, F.ONE)) {
        if (F.is0(t))
          throw new Error("Cannot find square root: probably non-prime P");
        let i = 1;
        let t_tmp = F.sqr(t);
        while (!F.eql(t_tmp, F.ONE)) {
          i++;
          t_tmp = F.sqr(t_tmp);
          if (i === M)
            throw new Error("Cannot find square root");
        }
        const exponent = _1n2 << BigInt(M - i - 1);
        const b = F.pow(c, exponent);
        M = i;
        c = F.sqr(b);
        t = F.mul(t, c);
        R = F.mul(R, b);
      }
      return R;
    };
  }
  function FpSqrt(P2) {
    aoddModulus(P2, "Fp.sqrt");
    if (P2 % _4n === _3n)
      return sqrt3mod4;
    if (P2 % _8n === _5n)
      return sqrt5mod8;
    if (P2 % _16n === _9n)
      return sqrt9mod16(P2);
    return tonelliShanks(P2);
  }
  var isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n2) === _1n2;
  var FIELD_FIELDS = [
    "create",
    "isValid",
    "is0",
    "neg",
    "inv",
    "sqrt",
    "sqr",
    "eql",
    "add",
    "sub",
    "mul",
    "pow",
    "div",
    "addN",
    "subN",
    "mulN",
    "sqrN"
  ];
  function validateField(field) {
    aobject3(field, "field");
    if (typeof field.ORDER !== "bigint")
      throw new TypeError('param "ORDER" is invalid: expected bigint, got ' + typeof field.ORDER);
    asafenumber(field.BYTES, "BYTES");
    asafenumber(field.BITS, "BITS");
    for (const name of FIELD_FIELDS)
      afunction(field[name], "field." + name);
    if (field.BYTES < 1 || field.BITS < 1)
      throw new Error("invalid field: expected BYTES/BITS > 0");
    if (field.ORDER <= _1n2)
      throw new Error("invalid field: expected ORDER > 1, got " + field.ORDER);
    return field;
  }
  function FpInvertBatch(Fp2, nums, passZero = false) {
    validateField(Fp2);
    aarray(nums, "nums");
    abool2(passZero, "passZero");
    const F = Fp2;
    const inverted = new Array(nums.length).fill(passZero ? F.ZERO : void 0);
    const multipliedAcc = nums.reduce((acc, num, i) => {
      if (F.is0(num))
        return acc;
      inverted[i] = acc;
      return F.mul(acc, num);
    }, F.ONE);
    const invertedAcc = F.inv(multipliedAcc);
    nums.reduceRight((acc, num, i) => {
      if (F.is0(num))
        return acc;
      inverted[i] = F.mul(acc, inverted[i]);
      return F.mul(acc, num);
    }, invertedAcc);
    return inverted;
  }
  function FpLegendre(Fp2, n) {
    validateField(Fp2);
    const F = Fp2;
    aoddModulus(F.ORDER, "FpLegendre");
    const p1mod2 = (F.ORDER - _1n2) / _2n;
    const powered = F.pow(n, p1mod2);
    const yes = F.eql(powered, F.ONE);
    const zero = F.eql(powered, F.ZERO);
    const no = F.eql(powered, F.neg(F.ONE));
    if (!yes && !zero && !no)
      throw new Error("invalid Legendre symbol result");
    return yes ? 1 : zero ? 0 : -1;
  }
  function nLength(n, nBitLength) {
    if (nBitLength !== void 0)
      anumber3(nBitLength);
    if (n <= _0n2)
      throw new Error("invalid n length: expected positive n, got " + n);
    if (nBitLength !== void 0 && nBitLength < 1)
      throw new Error("invalid n length: expected positive bit length, got " + nBitLength);
    const bits = bitLen(n);
    if (nBitLength !== void 0 && nBitLength < bits)
      throw new Error(`invalid n length: expected nBitLength (${nBitLength}) >= bitLen(n) (${bits})`);
    const _nBitLength = nBitLength !== void 0 ? nBitLength : bits;
    const nByteLength = Math.ceil(_nBitLength / 8);
    return { nBitLength: _nBitLength, nByteLength };
  }
  var FIELD_SQRT = /* @__PURE__ */ new WeakMap();
  var _Field = class {
    ORDER;
    BITS;
    BYTES;
    isLE;
    ZERO = _0n2;
    ONE = _1n2;
    _lengths;
    _mod;
    constructor(ORDER, opts = {}) {
      if (ORDER <= _1n2)
        throw new Error("invalid field: expected ORDER > 1, got " + ORDER);
      let _nbitLength = void 0;
      this.isLE = false;
      if (opts != null && typeof opts === "object") {
        if (typeof opts.BITS === "number")
          _nbitLength = opts.BITS;
        if (typeof opts.sqrt === "function")
          Object.defineProperty(this, "sqrt", { value: opts.sqrt, enumerable: true });
        if (typeof opts.isLE === "boolean")
          this.isLE = opts.isLE;
        if (opts.allowedLengths)
          this._lengths = Object.freeze(opts.allowedLengths.slice());
        if (typeof opts.modFromBytes === "boolean")
          this._mod = opts.modFromBytes;
      }
      const { nBitLength, nByteLength } = nLength(ORDER, _nbitLength);
      if (nByteLength > 2048)
        throw new Error("invalid field: expected ORDER of <= 2048 bytes");
      this.ORDER = ORDER;
      this.BITS = nBitLength;
      this.BYTES = nByteLength;
      Object.freeze(this);
    }
    create(num) {
      return mod(num, this.ORDER);
    }
    isValid(num) {
      if (typeof num !== "bigint")
        throw new TypeError("invalid field element: expected bigint, got " + typeof num);
      return _0n2 <= num && num < this.ORDER;
    }
    is0(num) {
      return num === _0n2;
    }
    // is valid and invertible
    isValidNot0(num) {
      return !this.is0(num) && this.isValid(num);
    }
    isOdd(num) {
      return (num & _1n2) === _1n2;
    }
    neg(num) {
      return mod(-num, this.ORDER);
    }
    eql(lhs, rhs) {
      return lhs === rhs;
    }
    sqr(num) {
      return mod(num * num, this.ORDER);
    }
    add(lhs, rhs) {
      return mod(lhs + rhs, this.ORDER);
    }
    sub(lhs, rhs) {
      return mod(lhs - rhs, this.ORDER);
    }
    mul(lhs, rhs) {
      return mod(lhs * rhs, this.ORDER);
    }
    pow(num, power) {
      return pow(num, power, this.ORDER);
    }
    div(lhs, rhs) {
      return mod(lhs * invert(rhs, this.ORDER), this.ORDER);
    }
    // Same as above, but doesn't normalize
    sqrN(num) {
      return num * num;
    }
    addN(lhs, rhs) {
      return lhs + rhs;
    }
    subN(lhs, rhs) {
      return lhs - rhs;
    }
    mulN(lhs, rhs) {
      return lhs * rhs;
    }
    inv(num) {
      return invert(num, this.ORDER);
    }
    sqrt(num) {
      let sqrt = FIELD_SQRT.get(this);
      if (!sqrt)
        FIELD_SQRT.set(this, sqrt = FpSqrt(this.ORDER));
      return sqrt(this, num);
    }
    toBytes(num) {
      return this.isLE ? numberToBytesLE(num, this.BYTES) : numberToBytesBE(num, this.BYTES);
    }
    fromBytes(bytes, skipValidation = false) {
      abytes3(bytes);
      const { _lengths: allowedLengths, BYTES, isLE: isLE3, ORDER, _mod: modFromBytes } = this;
      if (allowedLengths) {
        if (bytes.length < 1 || !allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
          throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
        }
        const padded = new Uint8Array(BYTES);
        padded.set(bytes, isLE3 ? 0 : padded.length - bytes.length);
        bytes = padded;
      }
      if (bytes.length !== BYTES)
        throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
      let scalar = isLE3 ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
      if (modFromBytes)
        scalar = mod(scalar, ORDER);
      if (!skipValidation) {
        if (!this.isValid(scalar))
          throw new Error("invalid field element: outside of range 0..ORDER");
      }
      return scalar;
    }
    // TODO: we don't need it here, move out to separate fn
    invertBatch(lst) {
      return FpInvertBatch(this, lst, true);
    }
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov(a, b, condition) {
      abool2(condition, "condition");
      return condition ? b : a;
    }
  };
  function Field(ORDER, opts = {}) {
    Object.freeze(_Field.prototype);
    return new _Field(ORDER, opts);
  }

  // ../../node_modules/@noble/curves/abstract/curve.js
  var _0n3 = /* @__PURE__ */ BigInt(0);
  var _1n3 = /* @__PURE__ */ BigInt(1);
  var _4n2 = /* @__PURE__ */ BigInt(4);
  var BLIND_BYTES = 16;
  var BLIND_BITS = 128;
  var FW_WINDOW = 5;
  var TABLE_BYTES_MAX = /* @__PURE__ */ (() => 2 ** 31)();
  function validatePointCons(Point) {
    const pc = Point;
    if (typeof pc !== "function")
      throw new TypeError('"Point" expected constructor, got type=' + typeof Point);
    afunction(pc.fromAffine, "Point.fromAffine");
    afunction(pc.fromBytes, "Point.fromBytes");
    afunction(pc.fromHex, "Point.fromHex");
    aobject3(pc.BASE, "Point.BASE");
    aobject3(pc.ZERO, "Point.ZERO");
    validateField(pc.Fp);
    validateField(pc.Fn);
  }
  function normalizeZ(c, points) {
    validatePointCons(c);
    validateMSMPoints(points, c);
    const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
    return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
  }
  function validateW(W, bits, min = 1) {
    if (!Number.isSafeInteger(W) || W < min || W > bits)
      throw new Error("invalid window size, expected [" + min + ".." + bits + "], got W=" + W);
  }
  function validateTableBytes(numPoints, fpBytes) {
    const bytes = numPoints * (4 * fpBytes + 128);
    if (bytes > TABLE_BYTES_MAX)
      throw new Error("invalid window size: table would need ~" + Math.ceil(bytes / 2 ** 20) + " MiB, max " + TABLE_BYTES_MAX / 2 ** 20 + " MiB");
  }
  function probeRandomBytes(randomBytes4, length) {
    if (randomBytes4 === void 0)
      return void 0;
    afunction(randomBytes4, "randomBytes");
    try {
      const probe = randomBytes4(length);
      if (!isBytes3(probe) || probe.length !== length)
        return void 0;
    } catch {
      return void 0;
    }
    return randomBytes4;
  }
  function validateMSMPoints(points, c) {
    aarray(points, "points");
    points.forEach((p, i) => {
      if (!(p instanceof c))
        throw new Error("invalid point at index " + i);
    });
  }
  function validateMSMScalars(scalars, field, maxScalar) {
    if (!Array.isArray(scalars))
      throw new Error("array of scalars expected");
    scalars.forEach((s, i) => {
      const ok = maxScalar === void 0 ? field.isValid(s) : isPosBig(s) && s < maxScalar;
      if (!ok)
        throw new Error("invalid scalar at index " + i);
    });
  }
  var pointWindowSizes = /* @__PURE__ */ new WeakMap();
  function getWindowSize(P2) {
    return pointWindowSizes.get(P2) || 1;
  }
  function oddMultiples(p, size) {
    const dbl = p.double();
    const t = [p];
    for (let j = 1; j < size; j++)
      t.push(t[j - 1].add(dbl));
    return t;
  }
  function wnafDigits(n, W) {
    const size = 2 ** W;
    const half = size / 2;
    const mask = BigInt(size - 1);
    const d = [];
    while (n > _0n3) {
      let w = 0;
      if (n & _1n3) {
        w = Number(n & mask);
        if (w >= half)
          w -= size;
        n -= BigInt(w);
      }
      d.push(w);
      n >>= _1n3;
    }
    return d;
  }
  function signedWindowDigits(n, W, windows) {
    const size = 2 ** W;
    const half = size / 2;
    const mask = BigInt(size - 1);
    const shiftBy = BigInt(W);
    const d = [];
    for (let w = 0; w < windows; w++) {
      let v = Number(n & mask);
      n >>= shiftBy;
      if (v > half) {
        v -= size;
        n += _1n3;
      }
      d.push(v);
    }
    if (n !== _0n3)
      throw new Error("invalid wnaf");
    return d;
  }
  function wnafWalk(zero, tables, digits) {
    let max = 0;
    for (const d of digits)
      max = Math.max(max, d.length);
    let acc = zero;
    for (let bit = max - 1; bit >= 0; bit--) {
      if (bit !== max - 1)
        acc = acc.double();
      for (let i = 0; i < digits.length; i++) {
        const w = digits[i][bit];
        if (w) {
          const item = tables[i][Math.abs(w) - 1 >> 1];
          acc = acc.add(w < 0 ? item.negate() : item);
        }
      }
    }
    return acc;
  }
  var ScalarMultiplier = class {
    Point;
    BASE;
    ZERO;
    randomBytes;
    wnafPrecomputes = /* @__PURE__ */ new WeakMap();
    baseCanBeBlinded;
    bits;
    // Parametrized with a given Point class (not individual point)
    constructor(Point, randomBytes4) {
      validatePointCons(Point);
      this.randomBytes = probeRandomBytes(randomBytes4, BLIND_BYTES);
      this.Point = Point;
      this.BASE = Point.BASE;
      this.ZERO = Point.ZERO;
      this.bits = Point.Fn.BITS;
    }
    /**
     * Creates a signed fixed-window wNAF precomputation table: for every window w, the
     * multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P`, flattened. All doublings are baked into the table,
     * so cached multiplication is additions-only. `windows = ceil(bits/W) + 1`: the extra
     * window absorbs the final carry of signed-digit recoding.
     * For a 256-bit curve and W=6, the table is 44⋅32 = 1408 points.
     * @param point - Point instance
     * @param W - window size
     * @param bits - scalar bitlength the table must cover
     */
    buildWnafTable(point, W, bits) {
      const windows = Math.ceil(bits / W) + 1;
      const half = 2 ** (W - 1);
      const comp = [];
      let base = point;
      for (let w = 0; w < windows; w++) {
        let acc = base;
        for (let i = 0; i < half; i++) {
          comp.push(acc);
          acc = acc.add(base);
        }
        base = comp[comp.length - 1].double();
      }
      return { W, bits, windows, comp };
    }
    /**
     * Implements ec multiplication using precomputed signed fixed-window wNAF tables.
     * Constant-time: fixed window count with one table addition per window — zero digits feed
     * the fake accumulator — and no doublings; the lookup scans the whole window slice.
     * Scalar bounds are validated by the public entry points ({@link ScalarMultiplier.mulCT},
     * {@link ScalarMultiplier.mulCTBlinded}, {@link ScalarMultiplier.mulUnsafe});
     * signedWindowDigits throws if `n` exceeds the table.
     * @returns real and fake (for const-time) points
     */
    wnafCachedCT(precomputes, n) {
      const { W, windows, comp } = precomputes;
      const half = 2 ** (W - 1);
      const digits = signedWindowDigits(n, W, windows);
      let p = this.ZERO;
      let f = this.BASE;
      for (let w = 0; w < windows; w++) {
        const digit = digits[w];
        const start = w * half;
        const idx = Math.abs(digit) - 1;
        let sel = comp[start];
        for (let i = 1; i < half; i++)
          sel = i === idx ? comp[start + i] : sel;
        const neg = sel.negate();
        if (digit === 0)
          f = f.add(comp[start]);
        else
          p = p.add(digit < 0 ? neg : sel);
      }
      return { p, f };
    }
    // Cache key is point identity plus (W, bits); at most two entries exist per point (public-width
    // `Fn.BITS` and blinded `Fn.BITS + BLIND_BITS`). Callers must not reuse the same point with
    // incompatible `transform(...)` layouts and expect a separate cache entry.
    getWnafPrecomputes(W, point, bits, transform) {
      let entries = this.wnafPrecomputes.get(point);
      let comp = entries?.find((entry) => entry.W === W && entry.bits === bits);
      if (!comp) {
        comp = this.buildWnafTable(point, W, bits);
        if (typeof transform === "function")
          comp = { ...comp, comp: transform(comp.comp) };
        if (!entries) {
          entries = [];
          this.wnafPrecomputes.set(point, entries);
        }
        entries.push(comp);
      }
      return comp;
    }
    assertPoint(point) {
      if (!(point instanceof this.Point))
        throw new TypeError('"point" expected Point instance, got type=' + typeof point);
    }
    // Shared prologue of the constant-time entry points. Rejects scalar 0: in key/signature-style
    // callers a zero scalar means broken upstream plumbing, and concrete Points already reject it.
    // Uses inRange instead of Fn.isValidNot0: validateField() only certifies the arithmetic subset.
    validateMulInput(point, scalar) {
      this.assertPoint(point);
      if (!inRange(scalar, _1n3, this.Point.Fn.ORDER))
        throw new Error("invalid scalar");
    }
    // Constant-time dispatch shared by mulCT / mulCTBlinded. Un-precomputed points (W===1, e.g.
    // ECDH peer keys) skip building a throwaway cached table in favor of a small fixed-window
    // multiply. `n` must be < 2^bits.
    runCT(point, n, bits, transform) {
      const W = getWindowSize(point);
      if (W === 1)
        return this.fixedWindowCT(point, n, bits);
      return this.wnafCachedCT(this.getWnafPrecomputes(W, point, bits, transform), n);
    }
    mulCT(point, scalar, transform) {
      this.validateMulInput(point, scalar);
      return this.runCT(point, scalar, this.bits, transform);
    }
    mulCTBlinded(point, scalar, transform) {
      this.validateMulInput(point, scalar);
      if (this.randomBytes === void 0)
        throw new Error("randomBytes is required for scalar blinding");
      const bits = this.Point.Fn.BITS + BLIND_BITS;
      const blind = this.randomBytes(BLIND_BYTES);
      if (!isBytes3(blind) || blind.length !== BLIND_BYTES)
        throw new Error("randomBytes returned invalid byte array");
      blind[0] = blind[0] & 63 | 128;
      const n = scalar + bytesToNumberBE(blind) * this.Point.Fn.ORDER;
      return this.runCT(point, n, bits, transform);
    }
    /**
     * Constant-time multiplication `n*point` for an un-precomputed point, via a small fixed window.
     * A cached wNAF table only pays off when reused; a flat 2^FW_WINDOW table (`size-1` adds) is
     * far cheaper to build for a single use. The point-operation sequence is independent of `n`:
     * build the table, then per window exactly FW_WINDOW doublings, a data-oblivious scan over
     * every table entry, and one addition (adds the identity when the window digit is 0 — never
     * skipped).
     *
     * `n` must be `< 2^bits`. Assumes complete addition (adding the identity costs the same as any
     * add), which holds for the Weierstrass/Edwards point types used here. The table is left in
     * projective form (no normalizeZ): normalizing this small a table costs more than the
     * mixed-add savings it would buy for a single multiply.
     * @returns real point `p`; `f` duplicates it only to match {@link wnafCachedCT}'s return shape
     * (this path needs no fake accumulator — its op-count is already scalar-independent).
     */
    fixedWindowCT(point, n, bits) {
      const W = FW_WINDOW;
      const size = 1 << W;
      const mask = bitMask(W);
      const table = new Array(size);
      table[0] = this.ZERO;
      for (let i = 1; i < size; i++)
        table[i] = table[i - 1].add(point);
      const windows = Math.ceil(bits / W);
      let acc = this.ZERO;
      for (let window = windows - 1; window >= 0; window--) {
        if (window !== windows - 1)
          for (let d = 0; d < W; d++)
            acc = acc.double();
        const digit = Number(n >> BigInt(window * W) & mask);
        let sel = table[0];
        for (let i = 1; i < size; i++)
          sel = i === digit ? table[i] : sel;
        acc = acc.add(sel);
      }
      return { p: acc, f: acc };
    }
    shouldBlind(point, cofactor) {
      if (this.randomBytes === void 0)
        return false;
      if (cofactor === _1n3)
        return true;
      if (point !== this.BASE)
        return false;
      if (this.baseCanBeBlinded === void 0)
        this.baseCanBeBlinded = this.mulUnsafe(this.BASE, this.Point.Fn.ORDER).is0();
      return this.baseCanBeBlinded;
    }
    mulSecret(point, scalar, cofactor, transform) {
      return this.shouldBlind(point, cofactor) ? this.mulCTBlinded(point, scalar, transform) : this.mulCT(point, scalar, transform);
    }
    mulUnsafe(point, scalar, transform) {
      this.assertPoint(point);
      if (!isPosBig(scalar))
        throw new Error("invalid scalar");
      const W = getWindowSize(point);
      if (W === 1 || scalar >= this.Point.Fn.ORDER)
        return mulAddUnsafe(this.Point, [point], [scalar], true);
      const precomputes = this.getWnafPrecomputes(W, point, this.bits, transform);
      return this.wnafCachedCT(precomputes, scalar).p;
    }
    // Remembers the window size used for precomputed wNAF multiplication of the given point
    // and drops any previously built tables. Usually only the base point is precomputed.
    // W=1 resets the point to the un-precomputed (table-less) paths.
    // W is additionally capped so tables stay under ~2 GiB ({@link TABLE_BYTES_MAX}).
    setWindowSize(point, W) {
      this.assertPoint(point);
      validateW(W, this.bits);
      const windows = Math.ceil((this.bits + BLIND_BITS) / W) + 1;
      validateTableBytes(windows * 2 ** (W - 1), this.Point.Fp.BYTES);
      pointWindowSizes.set(point, W);
      this.wnafPrecomputes.delete(point);
    }
    // True when a window size is set: tables themselves are built lazily on first multiply.
    hasWindowSize(point) {
      return getWindowSize(point) !== 1;
    }
  };
  function mulAddUnsafe(c, points, scalars, allowOversized = false) {
    validatePointCons(c);
    validateMSMPoints(points, c);
    abool2(allowOversized, "allowOversized");
    validateMSMScalars(scalars, c.Fn, allowOversized ? c.Fn.ORDER ** _4n2 : void 0);
    if (points.length !== scalars.length)
      throw new Error("arrays of points and scalars must have equal length");
    const tables = points.map((p) => oddMultiples(p, 4));
    const digits = scalars.map((n) => wnafDigits(n, 4));
    return wnafWalk(c.ZERO, tables, digits);
  }
  function createField(order, field, isLE3) {
    if (field) {
      if (field.ORDER !== order)
        throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
      validateField(field);
      return field;
    } else {
      return Field(order, { isLE: isLE3 });
    }
  }
  function createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
    if (type !== "weierstrass" && type !== "edwards")
      throw new Error('expected curve type "weierstrass" or "edwards"');
    if (FpFnLE === void 0)
      FpFnLE = type === "edwards";
    if (!CURVE || typeof CURVE !== "object")
      throw new Error(`expected valid ${type} CURVE object`);
    validateObject(curveOpts);
    for (const p of ["p", "n", "h"]) {
      const val = CURVE[p];
      if (!(isPosBig(val) && val !== _0n3))
        throw new Error(`CURVE.${p} must be positive bigint`);
    }
    const Fp2 = createField(CURVE.p, curveOpts.Fp, FpFnLE);
    const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
    const _b = type === "weierstrass" ? "b" : "d";
    const params = ["Gx", "Gy", "a", _b];
    for (const p of params) {
      if (!Fp2.isValid(CURVE[p]))
        throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
    }
    CURVE = Object.freeze(Object.assign({}, CURVE));
    return { CURVE, Fp: Fp2, Fn };
  }
  function createKeygen(randomSecretKey, getPublicKey) {
    return function keygen(seed) {
      const secretKey = randomSecretKey(seed);
      return { secretKey, publicKey: getPublicKey(secretKey) };
    };
  }

  // ../../node_modules/@noble/curves/abstract/edwards.js
  var _0n4 = /* @__PURE__ */ BigInt(0);
  var _1n4 = /* @__PURE__ */ BigInt(1);
  var _2n2 = /* @__PURE__ */ BigInt(2);
  var _4n3 = /* @__PURE__ */ BigInt(4);
  var _8n2 = /* @__PURE__ */ BigInt(8);
  function isEdValidXY(Fp2, CURVE, x, y) {
    const x2 = Fp2.sqr(x);
    const y2 = Fp2.sqr(y);
    const left = Fp2.add(Fp2.mul(CURVE.a, x2), y2);
    const right = Fp2.add(Fp2.ONE, Fp2.mul(CURVE.d, Fp2.mul(x2, y2)));
    return Fp2.eql(left, right);
  }
  function edwards(params, extraOpts = {}) {
    validateObject(extraOpts, {}, {}, "extraOpts");
    const opts = extraOpts;
    const validated = createCurveFields("edwards", params, opts, opts.FpFnLE);
    const { Fp: Fp2, Fn } = validated;
    let CURVE = validated.CURVE;
    const { h: cofactor } = CURVE;
    if (FpLegendre(Fp2, CURVE.a) !== 1)
      throw new Error("edwards: CURVE.a must be a square in Fp for complete addition formulas");
    if (FpLegendre(Fp2, CURVE.d) !== -1)
      throw new Error("edwards: CURVE.d must be a non-square in Fp for complete addition formulas");
    validateObject(opts, {}, { uvRatio: "function", randomBytes: "function" });
    const randomBytes4 = opts.randomBytes === void 0 ? randomBytes3 : opts.randomBytes;
    const MASK = _2n2 << BigInt(Fp2.BYTES * 8) - _1n4;
    function isOdd(n) {
      if (!Fp2.isOdd)
        throw new Error("Field does not have .isOdd()");
      return Fp2.isOdd(n);
    }
    const uvRatio2 = opts.uvRatio === void 0 ? (u, v) => {
      try {
        return { isValid: true, value: Fp2.sqrt(Fp2.div(u, v)) };
      } catch (e) {
        return { isValid: false, value: _0n4 };
      }
    } : opts.uvRatio;
    if (!isEdValidXY(Fp2, CURVE, CURVE.Gx, CURVE.Gy))
      throw new Error("bad curve params: generator point");
    const mulA = Fp2.eql(CURVE.a, Fp2.neg(Fp2.ONE)) ? (x) => Fp2.neg(x) : Fp2.eql(CURVE.a, Fp2.ONE) ? (x) => x : (x) => Fp2.mul(CURVE.a, x);
    function acoord(title, n, banZero = false) {
      const min = banZero ? _1n4 : _0n4;
      aInRange("coordinate " + title, n, min, MASK);
      return n;
    }
    function aedpoint(other) {
      if (!(other instanceof Point))
        throw new Error("EdwardsPoint expected");
    }
    class Point {
      static BASE = new Point(CURVE.Gx, CURVE.Gy, Fp2.ONE, Fp2.mul(CURVE.Gx, CURVE.Gy));
      static ZERO = new Point(Fp2.ZERO, Fp2.ONE, Fp2.ONE, Fp2.ZERO);
      static Fp = Fp2;
      static Fn = Fn;
      X;
      Y;
      Z;
      T;
      constructor(X, Y, Z, T) {
        this.X = acoord("x", X);
        this.Y = acoord("y", Y);
        this.Z = acoord("z", Z, true);
        this.T = acoord("t", T);
        Object.freeze(this);
      }
      static CURVE() {
        return CURVE;
      }
      /**
       * Create one extended Edwards point from affine coordinates.
       * Does NOT validate that the point is on-curve or torsion-free.
       * Use `.assertValidity()` on adversarial inputs.
       */
      static fromAffine(p) {
        if (p instanceof Point)
          throw new Error("extended point not allowed");
        const { x, y } = p || {};
        acoord("x", x);
        acoord("y", y);
        return new Point(x, y, Fp2.ONE, Fp2.mul(x, y));
      }
      // Uses algo from RFC8032 5.1.3.
      static fromBytes(bytes, zip215 = false) {
        const len = Fp2.BYTES;
        const { a, d } = CURVE;
        bytes = copyBytes3(abytes3(bytes, len, "point"));
        abool2(zip215, "zip215");
        const normed = copyBytes3(bytes);
        const lastByte = bytes[len - 1];
        normed[len - 1] = lastByte & ~128;
        const y = bytesToNumberLE(normed);
        const max = zip215 ? MASK : Fp2.ORDER;
        aInRange("point.y", y, _0n4, max);
        const y2 = Fp2.sqr(y);
        const u = Fp2.sub(y2, Fp2.ONE);
        const v = Fp2.sub(Fp2.mulN(d, y2), a);
        let { isValid, value: x } = uvRatio2(u, v);
        if (!isValid)
          throw new Error("bad point: invalid y coordinate");
        const isXOdd = isOdd(x);
        const isLastByteOdd = (lastByte & 128) !== 0;
        if (!zip215 && Fp2.is0(x) && isLastByteOdd)
          throw new Error("bad point: x=0 and x_0=1");
        if (isLastByteOdd !== isXOdd)
          x = Fp2.neg(x);
        return Point.fromAffine({ x, y });
      }
      static fromHex(hex, zip215 = false) {
        return Point.fromBytes(hexToBytes2(hex), zip215);
      }
      get x() {
        return this.toAffine().x;
      }
      get y() {
        return this.toAffine().y;
      }
      precompute(windowSize = 6, isLazy = true) {
        wnaf.setWindowSize(this, windowSize);
        if (!isLazy)
          this.multiply(_2n2);
        return this;
      }
      // Useful in fromAffine() - not for fromBytes(), which always created valid points.
      assertValidity() {
        const p = this;
        const { a, d } = CURVE;
        if (p.is0())
          throw new Error("bad point: ZERO");
        const { X, Y, Z, T } = p;
        const X2 = Fp2.sqr(X);
        const Y2 = Fp2.sqr(Y);
        const Z2 = Fp2.sqr(Z);
        const Z4 = Fp2.sqr(Z2);
        const aX2 = Fp2.mul(X2, a);
        const left = Fp2.mul(Fp2.add(aX2, Y2), Z2);
        const right = Fp2.add(Z4, Fp2.mul(d, Fp2.mul(X2, Y2)));
        if (!Fp2.eql(left, right))
          throw new Error("bad point: equation left != right (1)");
        const XY = Fp2.mul(X, Y);
        const ZT = Fp2.mul(Z, T);
        if (!Fp2.eql(XY, ZT))
          throw new Error("bad point: equation left != right (2)");
      }
      // Compare one point to another.
      equals(other) {
        aedpoint(other);
        const { X: X1, Y: Y1, Z: Z1 } = this;
        const { X: X2, Y: Y2, Z: Z2 } = other;
        const X1Z2 = Fp2.mul(X1, Z2);
        const X2Z1 = Fp2.mul(X2, Z1);
        const Y1Z2 = Fp2.mul(Y1, Z2);
        const Y2Z1 = Fp2.mul(Y2, Z1);
        return Fp2.eql(X1Z2, X2Z1) && Fp2.eql(Y1Z2, Y2Z1);
      }
      is0() {
        return this.equals(Point.ZERO);
      }
      negate() {
        return new Point(Fp2.neg(this.X), this.Y, this.Z, Fp2.neg(this.T));
      }
      // Fast algo for doubling Extended Point.
      // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
      // Cost: 4M + 4S + 1*a + 6add + 1*2.
      double() {
        const { X: X1, Y: Y1, Z: Z1 } = this;
        const A = Fp2.sqr(X1);
        const B = Fp2.sqr(Y1);
        const C = Fp2.mul(Fp2.sqr(Z1), _2n2);
        const D = mulA(A);
        const x1y1 = Fp2.addN(X1, Y1);
        const E = Fp2.sub(Fp2.subN(Fp2.sqr(x1y1), A), B);
        const G2 = Fp2.addN(D, B);
        const F = Fp2.subN(G2, C);
        const H = Fp2.subN(D, B);
        const X3 = Fp2.mul(E, F);
        const Y3 = Fp2.mul(G2, H);
        const T3 = Fp2.mul(E, H);
        const Z3 = Fp2.mul(F, G2);
        return new Point(X3, Y3, Z3, T3);
      }
      // Fast algo for adding 2 Extended Points.
      // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
      // Cost: 9M + 1*a + 1*d + 7add.
      add(other) {
        aedpoint(other);
        const { d } = CURVE;
        const { X: X1, Y: Y1, Z: Z1, T: T1 } = this;
        const { X: X2, Y: Y2, Z: Z2, T: T2 } = other;
        const A = Fp2.mul(X1, X2);
        const B = Fp2.mul(Y1, Y2);
        const C = Fp2.mul(Fp2.mulN(T1, d), T2);
        const D = Fp2.mul(Z1, Z2);
        const E = Fp2.sub(Fp2.subN(Fp2.mulN(Fp2.addN(X1, Y1), Fp2.addN(X2, Y2)), A), B);
        const F = Fp2.subN(D, C);
        const G2 = Fp2.addN(D, C);
        const H = Fp2.sub(B, mulA(A));
        const X3 = Fp2.mul(E, F);
        const Y3 = Fp2.mul(G2, H);
        const T3 = Fp2.mul(E, H);
        const Z3 = Fp2.mul(F, G2);
        return new Point(X3, Y3, Z3, T3);
      }
      subtract(other) {
        aedpoint(other);
        return this.add(other.negate());
      }
      // Constant-time multiplication.
      multiply(scalar) {
        if (!Fn.isValidNot0(scalar))
          throw new RangeError("invalid scalar: expected 1 <= sc < curve.n");
        const { p, f } = wnaf.mulSecret(this, scalar, cofactor, normalize);
        return normalize([p, f])[0];
      }
      // Non-constant-time multiplication. Uses double-and-add algorithm.
      // It's faster, but should only be used when you don't care about
      // an exposed private key e.g. sig verification.
      // Keeps the same subgroup-scalar contract: 0 is allowed for public-scalar callers, but
      // n and larger values are rejected instead of being reduced mod n to the identity point.
      multiplyUnsafe(scalar) {
        if (!Fn.isValid(scalar))
          throw new RangeError("invalid scalar: expected 0 <= sc < curve.n");
        if (scalar === _0n4)
          return Point.ZERO;
        if (this.is0() || scalar === _1n4)
          return this;
        return wnaf.mulUnsafe(this, scalar, normalize);
      }
      // Checks if point is of small order.
      // If you add something to small order point, you will have "dirty"
      // point with torsion component.
      // Clears cofactor and checks if the result is 0.
      isSmallOrder() {
        return this.clearCofactor().is0();
      }
      // Multiplies point by curve order and checks if the result is 0.
      // Returns `false` is the point is dirty.
      isTorsionFree() {
        return wnaf.mulUnsafe(this, CURVE.n).is0();
      }
      // Converts Extended point to default (x, y) coordinates.
      // Can accept precomputed Z^-1 - for example, from invertBatch.
      toAffine(invertedZ) {
        const p = this;
        let iz = invertedZ;
        if (iz != null && typeof iz !== "bigint")
          throw new TypeError('"invertedZ" expected bigint, got type=' + typeof iz);
        const { X, Y, Z } = p;
        const is0 = p.is0();
        if (iz == null)
          iz = is0 ? Fp2.create(_8n2) : Fp2.inv(Z);
        const x = Fp2.mul(X, iz);
        const y = Fp2.mul(Y, iz);
        const zz = Fp2.mul(Z, iz);
        if (is0)
          return { x: Fp2.ZERO, y: Fp2.ONE };
        if (!Fp2.eql(zz, Fp2.ONE))
          throw new Error("invZ was invalid");
        return { x, y };
      }
      clearCofactor() {
        if (cofactor === _1n4)
          return this;
        if (cofactor === _2n2)
          return this.double();
        if (cofactor === _4n3)
          return this.double().double();
        if (cofactor === _8n2)
          return this.double().double().double();
        return this.multiplyUnsafe(cofactor);
      }
      toBytes() {
        const { x, y } = this.toAffine();
        const bytes = Fp2.toBytes(y);
        bytes[bytes.length - 1] |= isOdd(x) ? 128 : 0;
        return bytes;
      }
      toHex() {
        return bytesToHex2(this.toBytes());
      }
      toString() {
        return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
      }
    }
    const normalize = (points) => normalizeZ(Point, points);
    const wnaf = new ScalarMultiplier(Point, randomBytes4);
    if (wnaf.bits >= 6)
      Point.BASE.precompute(6);
    Object.freeze(Point.prototype);
    Object.freeze(Point);
    return Point;
  }
  function eddsa(Point, cHash, eddsaOpts = {}) {
    validatePointCons(Point);
    if (typeof cHash !== "function")
      throw new Error('"hash" function param is required');
    const hash = cHash;
    const opts = eddsaOpts;
    validateObject(opts, {}, {
      adjustScalarBytes: "function",
      randomBytes: "function",
      domain: "function",
      prehash: "function",
      zip215: "boolean",
      mapToCurve: "function",
      toMontgomery: "function",
      toMontgomerySecret: "function"
    });
    const { prehash } = opts;
    const { BASE, Fp: Fp2, Fn } = Point;
    const outputLen = hash.outputLen;
    const expectedLen = 2 * Fp2.BYTES;
    if (outputLen !== void 0) {
      asafenumber(outputLen, "hash.outputLen");
      if (outputLen !== expectedLen)
        throw new Error(`hash.outputLen must be ${expectedLen}, got ${outputLen}`);
    }
    const randomBytes4 = opts.randomBytes === void 0 ? randomBytes3 : opts.randomBytes;
    const toMontgomery2 = opts.toMontgomery;
    const toMontgomerySecret2 = opts.toMontgomerySecret;
    const adjustScalarBytes2 = opts.adjustScalarBytes === void 0 ? (bytes) => bytes : opts.adjustScalarBytes;
    const domain = opts.domain === void 0 ? (data, ctx, phflag) => {
      abool2(phflag, "phflag");
      if (ctx.length || phflag)
        throw new Error("Contexts/pre-hash are not supported");
      return data;
    } : opts.domain;
    function modN_LE(hash2) {
      return Fn.create(bytesToNumberLE(hash2));
    }
    function getPrivateScalar(key) {
      const len = lengths.secretKey;
      abytes3(key, lengths.secretKey, "secretKey");
      const hashed = abytes3(hash(key), 2 * len, "hashedSecretKey");
      const head = adjustScalarBytes2(hashed.slice(0, len));
      const prefix = hashed.slice(len, 2 * len);
      const scalar = modN_LE(head);
      return { head, prefix, scalar };
    }
    function getExtendedPublicKey(secretKey) {
      const { head, prefix, scalar } = getPrivateScalar(secretKey);
      const point = BASE.multiply(scalar);
      const pointBytes = point.toBytes();
      return { head, prefix, scalar, point, pointBytes };
    }
    function getPublicKey(secretKey) {
      return getExtendedPublicKey(secretKey).pointBytes;
    }
    function hashDomainToScalar(context = Uint8Array.of(), ...msgs) {
      const msg = concatBytes2(...msgs);
      return modN_LE(hash(domain(msg, abytes3(context, void 0, "context"), !!prehash)));
    }
    function sign(msg, secretKey, options = {}) {
      validateObject(options, {}, {}, "options");
      msg = copyBytes3(abytes3(msg, void 0, "message"));
      if (prehash)
        msg = prehash(msg);
      const { prefix, scalar, pointBytes } = getExtendedPublicKey(secretKey);
      const r = hashDomainToScalar(options.context, prefix, msg);
      const R = BASE.multiply(r).toBytes();
      const k = hashDomainToScalar(options.context, R, pointBytes, msg);
      const s = Fn.create(r + k * scalar);
      if (!Fn.isValid(s))
        throw new Error("sign failed: invalid s");
      const rs = concatBytes2(R, Fn.toBytes(s));
      return abytes3(rs, lengths.signature, "result");
    }
    const verifyOpts = {
      zip215: opts.zip215
    };
    function verify(sig, msg, publicKey, options = verifyOpts) {
      validateObject(options);
      const { context } = options;
      const zip215 = options.zip215 === void 0 ? !!verifyOpts.zip215 : options.zip215;
      const len = lengths.signature;
      sig = abytes3(sig, len, "signature");
      msg = abytes3(msg, void 0, "message");
      publicKey = abytes3(publicKey, lengths.publicKey, "publicKey");
      if (zip215 !== void 0)
        abool2(zip215, "zip215");
      if (prehash)
        msg = prehash(msg);
      const mid = len / 2;
      const r = sig.subarray(0, mid);
      const s = bytesToNumberLE(sig.subarray(mid, len));
      let A, R, SB;
      try {
        A = Point.fromBytes(publicKey, zip215);
        R = Point.fromBytes(r, zip215);
        SB = BASE.multiplyUnsafe(s);
      } catch (error) {
        return false;
      }
      if (!zip215 && A.isSmallOrder())
        return false;
      const k = hashDomainToScalar(context, r, publicKey, msg);
      const RkA = R.add(A.multiplyUnsafe(k));
      return RkA.subtract(SB).clearCofactor().is0();
    }
    const _size = Fp2.BYTES;
    const lengths = {
      secretKey: _size,
      publicKey: _size,
      signature: 2 * _size,
      seed: _size
    };
    function randomSecretKey(seed) {
      seed = seed === void 0 ? randomBytes4(lengths.seed) : seed;
      return abytes3(seed, lengths.seed, "seed");
    }
    function isValidSecretKey(key) {
      return isBytes3(key) && key.length === lengths.secretKey;
    }
    function isValidPublicKey(key, zip215) {
      try {
        return !!Point.fromBytes(key, zip215 === void 0 ? verifyOpts.zip215 : zip215);
      } catch (error) {
        return false;
      }
    }
    const utils = {
      getExtendedPublicKey,
      randomSecretKey,
      isValidSecretKey,
      isValidPublicKey,
      /** Converts an Edwards public key to a companion Montgomery public key. */
      toMontgomery(publicKey) {
        if (toMontgomery2 === void 0)
          throw new Error("Montgomery conversion is not supported for this curve");
        return toMontgomery2(Point.fromBytes(publicKey));
      },
      toMontgomerySecret(secretKey) {
        if (toMontgomerySecret2 === void 0)
          throw new Error("Montgomery conversion is not supported for this curve");
        return toMontgomerySecret2(secretKey);
      }
    };
    Object.freeze(lengths);
    Object.freeze(utils);
    return Object.freeze({
      keygen: createKeygen(randomSecretKey, getPublicKey),
      getPublicKey,
      sign,
      verify,
      utils,
      Point,
      lengths
    });
  }

  // ../../node_modules/@noble/curves/ed25519.js
  var _1n5 = /* @__PURE__ */ BigInt(1);
  var _2n3 = /* @__PURE__ */ BigInt(2);
  var _5n2 = /* @__PURE__ */ BigInt(5);
  var _8n3 = /* @__PURE__ */ BigInt(8);
  var ed25519_CURVE_p = /* @__PURE__ */ BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed");
  var ed25519_CURVE = /* @__PURE__ */ (() => ({
    p: ed25519_CURVE_p,
    n: BigInt("0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed"),
    h: _8n3,
    a: BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec"),
    d: BigInt("0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3"),
    Gx: BigInt("0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a"),
    Gy: BigInt("0x6666666666666666666666666666666666666666666666666666666666666658")
  }))();
  function ed25519_pow_2_252_3(x) {
    const _10n = BigInt(10), _20n = BigInt(20), _40n = BigInt(40), _80n = BigInt(80);
    const P2 = ed25519_CURVE_p;
    const x2 = x * x % P2;
    const b2 = x2 * x % P2;
    const b4 = pow2(b2, _2n3, P2) * b2 % P2;
    const b5 = pow2(b4, _1n5, P2) * x % P2;
    const b10 = pow2(b5, _5n2, P2) * b5 % P2;
    const b20 = pow2(b10, _10n, P2) * b10 % P2;
    const b40 = pow2(b20, _20n, P2) * b20 % P2;
    const b80 = pow2(b40, _40n, P2) * b40 % P2;
    const b160 = pow2(b80, _80n, P2) * b80 % P2;
    const b240 = pow2(b160, _80n, P2) * b80 % P2;
    const b250 = pow2(b240, _10n, P2) * b10 % P2;
    const pow_p_5_8 = pow2(b250, _2n3, P2) * x % P2;
    return { pow_p_5_8, b2 };
  }
  function adjustScalarBytes(bytes) {
    bytes[0] &= 248;
    bytes[31] &= 127;
    bytes[31] |= 64;
    return bytes;
  }
  var ED25519_SQRT_M1 = /* @__PURE__ */ BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
  function uvRatio(u, v) {
    const P2 = ed25519_CURVE_p;
    const v3 = mod(v * v * v, P2);
    const v7 = mod(v3 * v3 * v, P2);
    const pow3 = ed25519_pow_2_252_3(u * v7).pow_p_5_8;
    let x = mod(u * v3 * pow3, P2);
    const vx2 = mod(v * x * x, P2);
    const root1 = x;
    const root2 = mod(x * ED25519_SQRT_M1, P2);
    const useRoot1 = vx2 === u;
    const useRoot2 = vx2 === mod(-u, P2);
    const noRoot = vx2 === mod(-u * ED25519_SQRT_M1, P2);
    if (useRoot1)
      x = root1;
    if (useRoot2 || noRoot)
      x = root2;
    if (isNegativeLE(x, P2))
      x = mod(-x, P2);
    return { isValid: useRoot1 || useRoot2, value: x };
  }
  var ed25519_Point = /* @__PURE__ */ edwards(ed25519_CURVE, { uvRatio });
  var Fp = /* @__PURE__ */ (() => ed25519_Point.Fp)();
  function toMontgomery(point) {
    const { y } = point;
    return Fp.toBytes(Fp.div(_1n5 + y, _1n5 - y));
  }
  function toMontgomerySecret(secretKey) {
    const size = ed25519_Point.Fp.BYTES;
    abytes2(secretKey, size);
    return adjustScalarBytes(sha512(secretKey.subarray(0, size))).subarray(0, size);
  }
  function ed(opts) {
    return eddsa(ed25519_Point, sha512, Object.assign({ adjustScalarBytes, toMontgomery, toMontgomerySecret, zip215: true }, opts));
  }
  var ed25519 = /* @__PURE__ */ ed({});

  // ../../node_modules/@noble/hashes/_blake.js
  var BSIGMA = /* @__PURE__ */ Uint8Array.from([
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    14,
    10,
    4,
    8,
    9,
    15,
    13,
    6,
    1,
    12,
    0,
    2,
    11,
    7,
    5,
    3,
    11,
    8,
    12,
    0,
    5,
    2,
    15,
    13,
    10,
    14,
    3,
    6,
    7,
    1,
    9,
    4,
    7,
    9,
    3,
    1,
    13,
    12,
    11,
    14,
    2,
    6,
    5,
    10,
    4,
    0,
    15,
    8,
    9,
    0,
    5,
    7,
    2,
    4,
    10,
    15,
    14,
    1,
    11,
    12,
    6,
    8,
    3,
    13,
    2,
    12,
    6,
    10,
    0,
    11,
    8,
    3,
    4,
    13,
    7,
    5,
    15,
    14,
    1,
    9,
    12,
    5,
    1,
    15,
    14,
    13,
    4,
    10,
    0,
    7,
    6,
    3,
    9,
    2,
    8,
    11,
    13,
    11,
    7,
    14,
    12,
    1,
    3,
    9,
    5,
    0,
    15,
    4,
    8,
    6,
    2,
    10,
    6,
    15,
    14,
    9,
    11,
    3,
    0,
    8,
    12,
    2,
    13,
    7,
    1,
    4,
    10,
    5,
    10,
    2,
    8,
    4,
    7,
    6,
    1,
    5,
    15,
    11,
    9,
    14,
    3,
    12,
    13,
    0,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    14,
    10,
    4,
    8,
    9,
    15,
    13,
    6,
    1,
    12,
    0,
    2,
    11,
    7,
    5,
    3,
    // Blake1, unused in others
    11,
    8,
    12,
    0,
    5,
    2,
    15,
    13,
    10,
    14,
    3,
    6,
    7,
    1,
    9,
    4,
    7,
    9,
    3,
    1,
    13,
    12,
    11,
    14,
    2,
    6,
    5,
    10,
    4,
    0,
    15,
    8,
    9,
    0,
    5,
    7,
    2,
    4,
    10,
    15,
    14,
    1,
    11,
    12,
    6,
    8,
    3,
    13,
    2,
    12,
    6,
    10,
    0,
    11,
    8,
    3,
    4,
    13,
    7,
    5,
    15,
    14,
    1,
    9
  ]);

  // ../../node_modules/@noble/hashes/blake2.js
  var B2B_IV = /* @__PURE__ */ Uint32Array.from([
    4089235720,
    1779033703,
    2227873595,
    3144134277,
    4271175723,
    1013904242,
    1595750129,
    2773480762,
    2917565137,
    1359893119,
    725511199,
    2600822924,
    4215389547,
    528734635,
    327033209,
    1541459225
  ]);
  var BBUF = /* @__PURE__ */ new Uint32Array(32);
  function G1b(a, b, c, d, msg, x) {
    const Xl = msg[x], Xh = msg[x + 1];
    let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
    let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
    let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
    let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
    const ll = add3L(Al, Bl, Xl);
    Ah = add3H(ll, Ah, Bh, Xh);
    Al = ll | 0;
    let xh = Dh ^ Ah, xl = Dl ^ Al;
    Dh = rotr32H(xh, xl);
    Dl = rotr32L(xh, xl);
    ({ h: Ch, l: Cl } = add(Ch, Cl, Dh, Dl));
    xh = Bh ^ Ch;
    xl = Bl ^ Cl;
    Bh = rotrSH(xh, xl, 24);
    Bl = rotrSL(xh, xl, 24);
    BBUF[2 * a] = Al;
    BBUF[2 * a + 1] = Ah;
    BBUF[2 * b] = Bl;
    BBUF[2 * b + 1] = Bh;
    BBUF[2 * c] = Cl;
    BBUF[2 * c + 1] = Ch;
    BBUF[2 * d] = Dl;
    BBUF[2 * d + 1] = Dh;
  }
  function G2b(a, b, c, d, msg, x) {
    const Xl = msg[x], Xh = msg[x + 1];
    let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
    let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
    let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
    let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
    const ll = add3L(Al, Bl, Xl);
    Ah = add3H(ll, Ah, Bh, Xh);
    Al = ll | 0;
    let xh = Dh ^ Ah, xl = Dl ^ Al;
    Dh = rotrSH(xh, xl, 16);
    Dl = rotrSL(xh, xl, 16);
    ({ h: Ch, l: Cl } = add(Ch, Cl, Dh, Dl));
    xh = Bh ^ Ch;
    xl = Bl ^ Cl;
    Bh = rotrBH(xh, xl, 63);
    Bl = rotrBL(xh, xl, 63);
    BBUF[2 * a] = Al;
    BBUF[2 * a + 1] = Ah;
    BBUF[2 * b] = Bl;
    BBUF[2 * b + 1] = Bh;
    BBUF[2 * c] = Cl;
    BBUF[2 * c + 1] = Ch;
    BBUF[2 * d] = Dl;
    BBUF[2 * d + 1] = Dh;
  }
  function checkBlake2Opts(outputLen, opts = {}, keyLen, saltLen, persLen) {
    anumber2(keyLen);
    if (outputLen <= 0 || outputLen > keyLen)
      throw new Error('"dkLen" must be 1..' + keyLen + ", got " + outputLen);
    const { key, salt, personalization } = opts;
    if (key !== void 0 && (key.length < 1 || key.length > keyLen))
      throw new Error('"key" expected to be undefined or of length=1..' + keyLen);
    if (salt !== void 0)
      abytes2(salt, saltLen, "salt");
    if (personalization !== void 0)
      abytes2(personalization, persLen, "personalization");
  }
  var _BLAKE2 = class {
    buffer;
    buffer32;
    finished = false;
    destroyed = false;
    length = 0;
    pos = 0;
    blockLen;
    outputLen;
    canXOF = false;
    constructor(blockLen, outputLen) {
      anumber2(blockLen);
      anumber2(outputLen);
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.buffer = new Uint8Array(blockLen);
      this.buffer32 = u322(this.buffer);
    }
    update(data) {
      aexists2(this);
      abytes2(data);
      const { blockLen, buffer, buffer32 } = this;
      const len = data.length;
      const offset = data.byteOffset;
      const buf = data.buffer;
      for (let pos = 0; pos < len; ) {
        if (this.pos === blockLen) {
          swap32IfBE2(buffer32);
          this.compress(buffer32, 0, false);
          swap32IfBE2(buffer32);
          this.pos = 0;
        }
        const take = Math.min(blockLen - this.pos, len - pos);
        const dataOffset = offset + pos;
        if (take === blockLen && !(dataOffset % 4) && pos + take < len) {
          const data32 = new Uint32Array(buf, dataOffset, Math.floor((len - pos) / 4));
          swap32IfBE2(data32);
          for (let pos32 = 0; pos + blockLen < len; pos32 += buffer32.length, pos += blockLen) {
            this.length += blockLen;
            this.compress(data32, pos32, false);
          }
          swap32IfBE2(data32);
          continue;
        }
        buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        this.length += take;
        pos += take;
      }
      return this;
    }
    digestInto(out) {
      aexists2(this);
      aoutput2(out, this);
      if (out.byteOffset & 3)
        throw new RangeError('"output" expected 4-byte aligned byteOffset, got ' + out.byteOffset);
      const { pos, buffer32 } = this;
      this.finished = true;
      this.buffer.fill(0, pos);
      swap32IfBE2(buffer32);
      this.compress(buffer32, 0, true);
      swap32IfBE2(buffer32);
      const state = this.get();
      const out32 = out === this.buffer ? buffer32 : u322(out);
      const full = Math.floor(this.outputLen / 4);
      for (let i = 0; i < full; i++)
        out32[i] = swap8IfBE(state[i]);
      const tail = this.outputLen % 4;
      if (!tail)
        return;
      const off = full * 4;
      const word = state[full];
      for (let i = 0; i < tail; i++)
        out[off + i] = word >>> 8 * i;
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
      const res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
    _cloneInto(to) {
      const { buffer, length, finished, destroyed, outputLen, pos } = this;
      to ||= new this.constructor({ dkLen: outputLen });
      to.set(...this.get());
      to.buffer.set(buffer);
      to.destroyed = destroyed;
      to.finished = finished;
      to.length = length;
      to.pos = pos;
      to.outputLen = outputLen;
      return to;
    }
    clone() {
      return this._cloneInto();
    }
  };
  var _BLAKE2b = class extends _BLAKE2 {
    // Same IV words as SHA-512 / BLAKE2b, encoded as LE u32 low/high halves.
    v0l = B2B_IV[0] | 0;
    v0h = B2B_IV[1] | 0;
    v1l = B2B_IV[2] | 0;
    v1h = B2B_IV[3] | 0;
    v2l = B2B_IV[4] | 0;
    v2h = B2B_IV[5] | 0;
    v3l = B2B_IV[6] | 0;
    v3h = B2B_IV[7] | 0;
    v4l = B2B_IV[8] | 0;
    v4h = B2B_IV[9] | 0;
    v5l = B2B_IV[10] | 0;
    v5h = B2B_IV[11] | 0;
    v6l = B2B_IV[12] | 0;
    v6h = B2B_IV[13] | 0;
    v7l = B2B_IV[14] | 0;
    v7h = B2B_IV[15] | 0;
    constructor(opts = {}) {
      opts = checkOpts2({}, opts);
      const olen = opts.dkLen === void 0 ? 64 : opts.dkLen;
      super(128, olen);
      checkBlake2Opts(olen, opts, 64, 16, 16);
      let { key, personalization, salt } = opts;
      let keyLength = 0;
      if (key !== void 0) {
        abytes2(key, void 0, "key");
        keyLength = key.length;
      }
      this.v0l ^= this.outputLen | keyLength << 8 | 1 << 16 | 1 << 24;
      if (salt !== void 0) {
        abytes2(salt, void 0, "salt");
        const slt = u322(copyBytes2(salt));
        this.v4l ^= swap8IfBE(slt[0]);
        this.v4h ^= swap8IfBE(slt[1]);
        this.v5l ^= swap8IfBE(slt[2]);
        this.v5h ^= swap8IfBE(slt[3]);
      }
      if (personalization !== void 0) {
        abytes2(personalization, void 0, "personalization");
        const pers = u322(copyBytes2(personalization));
        this.v6l ^= swap8IfBE(pers[0]);
        this.v6h ^= swap8IfBE(pers[1]);
        this.v7l ^= swap8IfBE(pers[2]);
        this.v7h ^= swap8IfBE(pers[3]);
      }
      if (key !== void 0) {
        const tmp = new Uint8Array(this.blockLen);
        tmp.set(key);
        this.update(tmp);
        clean2(tmp);
      }
    }
    // prettier-ignore
    get() {
      let { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
      return [v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h];
    }
    // prettier-ignore
    set(v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h) {
      this.v0l = v0l | 0;
      this.v0h = v0h | 0;
      this.v1l = v1l | 0;
      this.v1h = v1h | 0;
      this.v2l = v2l | 0;
      this.v2h = v2h | 0;
      this.v3l = v3l | 0;
      this.v3h = v3h | 0;
      this.v4l = v4l | 0;
      this.v4h = v4h | 0;
      this.v5l = v5l | 0;
      this.v5h = v5h | 0;
      this.v6l = v6l | 0;
      this.v6h = v6h | 0;
      this.v7l = v7l | 0;
      this.v7h = v7h | 0;
    }
    compress(msg, offset, isLast) {
      const { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
      {
        BBUF[0] = v0l;
        BBUF[1] = v0h;
        BBUF[2] = v1l;
        BBUF[3] = v1h;
        BBUF[4] = v2l;
        BBUF[5] = v2h;
        BBUF[6] = v3l;
        BBUF[7] = v3h;
        BBUF[8] = v4l;
        BBUF[9] = v4h;
        BBUF[10] = v5l;
        BBUF[11] = v5h;
        BBUF[12] = v6l;
        BBUF[13] = v6h;
        BBUF[14] = v7l;
        BBUF[15] = v7h;
      }
      BBUF.set(B2B_IV, 16);
      const l = fromNumL(this.length);
      const h = fromNumH(this.length);
      BBUF[24] = B2B_IV[8] ^ l;
      BBUF[25] = B2B_IV[9] ^ h;
      if (isLast) {
        BBUF[28] = ~BBUF[28];
        BBUF[29] = ~BBUF[29];
      }
      let j = 0;
      const s = BSIGMA;
      for (let i = 0; i < 12; i++) {
        G1b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
        G2b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
        G1b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
        G2b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
        G1b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
        G2b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
        G1b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
        G2b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
        G1b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
        G2b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
        G1b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
        G2b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
        G1b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
        G2b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
        G1b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
        G2b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
      }
      this.v0l ^= BBUF[0] ^ BBUF[16];
      this.v0h ^= BBUF[1] ^ BBUF[17];
      this.v1l ^= BBUF[2] ^ BBUF[18];
      this.v1h ^= BBUF[3] ^ BBUF[19];
      this.v2l ^= BBUF[4] ^ BBUF[20];
      this.v2h ^= BBUF[5] ^ BBUF[21];
      this.v3l ^= BBUF[6] ^ BBUF[22];
      this.v3h ^= BBUF[7] ^ BBUF[23];
      this.v4l ^= BBUF[8] ^ BBUF[24];
      this.v4h ^= BBUF[9] ^ BBUF[25];
      this.v5l ^= BBUF[10] ^ BBUF[26];
      this.v5h ^= BBUF[11] ^ BBUF[27];
      this.v6l ^= BBUF[12] ^ BBUF[28];
      this.v6h ^= BBUF[13] ^ BBUF[29];
      this.v7l ^= BBUF[14] ^ BBUF[30];
      this.v7h ^= BBUF[15] ^ BBUF[31];
      clean2(BBUF);
    }
    destroy() {
      this.destroyed = true;
      clean2(this.buffer32);
      this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
  };
  var blake2b = /* @__PURE__ */ createHasher((opts) => new _BLAKE2b(opts));

  // ../../node_modules/@noble/hashes/argon2.js
  var AT = { Argon2d: 0, Argon2i: 1, Argon2id: 2 };
  var ARGON2_SYNC_POINTS = 4;
  var abytesOrZero = (buf, errorTitle = "") => {
    if (buf === void 0)
      return Uint8Array.of();
    return kdfInputToBytes(buf, errorTitle);
  };
  var A2_BUF = new Uint32Array(256);
  function G(a, b, c, d) {
    let Al = A2_BUF[2 * a], Ah = A2_BUF[2 * a + 1];
    let Bl = A2_BUF[2 * b], Bh = A2_BUF[2 * b + 1];
    let Cl = A2_BUF[2 * c], Ch = A2_BUF[2 * c + 1];
    let Dl = A2_BUF[2 * d], Dh = A2_BUF[2 * d + 1];
    let ml = 0, mh = 0, rl = 0, xh = 0, xl = 0;
    ml = Math.imul(Al, Bl);
    mh = ((Al >>> 0) * (Bl >>> 0) - (ml >>> 0)) / 4294967296 + 0.5 | 0;
    rl = (Al >>> 0) + (Bl >>> 0) + (ml << 1 >>> 0);
    Ah = Ah + Bh + (mh << 1 | ml >>> 31) + (rl / 4294967296 | 0) | 0;
    Al = rl | 0;
    xh = Dh ^ Ah;
    xl = Dl ^ Al;
    Dh = xl;
    Dl = xh;
    ml = Math.imul(Cl, Dl);
    mh = ((Cl >>> 0) * (Dl >>> 0) - (ml >>> 0)) / 4294967296 + 0.5 | 0;
    rl = (Cl >>> 0) + (Dl >>> 0) + (ml << 1 >>> 0);
    Ch = Ch + Dh + (mh << 1 | ml >>> 31) + (rl / 4294967296 | 0) | 0;
    Cl = rl | 0;
    xh = Bh ^ Ch;
    xl = Bl ^ Cl;
    Bh = xh >>> 24 | xl << 8;
    Bl = xh << 8 | xl >>> 24;
    ml = Math.imul(Al, Bl);
    mh = ((Al >>> 0) * (Bl >>> 0) - (ml >>> 0)) / 4294967296 + 0.5 | 0;
    rl = (Al >>> 0) + (Bl >>> 0) + (ml << 1 >>> 0);
    Ah = Ah + Bh + (mh << 1 | ml >>> 31) + (rl / 4294967296 | 0) | 0;
    Al = rl | 0;
    xh = Dh ^ Ah;
    xl = Dl ^ Al;
    Dh = xh >>> 16 | xl << 16;
    Dl = xh << 16 | xl >>> 16;
    ml = Math.imul(Cl, Dl);
    mh = ((Cl >>> 0) * (Dl >>> 0) - (ml >>> 0)) / 4294967296 + 0.5 | 0;
    rl = (Cl >>> 0) + (Dl >>> 0) + (ml << 1 >>> 0);
    Ch = Ch + Dh + (mh << 1 | ml >>> 31) + (rl / 4294967296 | 0) | 0;
    Cl = rl | 0;
    xh = Bh ^ Ch;
    xl = Bl ^ Cl;
    Bh = xh << 1 | xl >>> 31;
    Bl = xh >>> 31 | xl << 1;
    A2_BUF[2 * a] = Al, A2_BUF[2 * a + 1] = Ah;
    A2_BUF[2 * b] = Bl, A2_BUF[2 * b + 1] = Bh;
    A2_BUF[2 * c] = Cl, A2_BUF[2 * c + 1] = Ch;
    A2_BUF[2 * d] = Dl, A2_BUF[2 * d + 1] = Dh;
  }
  function P(v00, v01, v02, v03, v04, v05, v06, v07, v08, v09, v10, v11, v12, v13, v14, v15) {
    G(v00, v04, v08, v12);
    G(v01, v05, v09, v13);
    G(v02, v06, v10, v14);
    G(v03, v07, v11, v15);
    G(v00, v05, v10, v15);
    G(v01, v06, v11, v12);
    G(v02, v07, v08, v13);
    G(v03, v04, v09, v14);
  }
  function block(x, xPos, yPos, outPos, needXor) {
    if (needXor) {
      for (let i = 0; i < 256; i++) {
        const r = x[xPos + i] ^ x[yPos + i];
        A2_BUF[i] = r;
        x[outPos + i] ^= r;
      }
    } else {
      for (let i = 0; i < 256; i++) {
        const r = x[xPos + i] ^ x[yPos + i];
        A2_BUF[i] = r;
        x[outPos + i] = r;
      }
    }
    for (let i = 0; i < 128; i += 16) {
      P(i, i + 1, i + 2, i + 3, i + 4, i + 5, i + 6, i + 7, i + 8, i + 9, i + 10, i + 11, i + 12, i + 13, i + 14, i + 15);
    }
    for (let i = 0; i < 16; i += 2) {
      P(i, i + 1, i + 16, i + 17, i + 32, i + 33, i + 48, i + 49, i + 64, i + 65, i + 80, i + 81, i + 96, i + 97, i + 112, i + 113);
    }
    for (let i = 0; i < 256; i++)
      x[outPos + i] ^= A2_BUF[i];
    clean2(A2_BUF);
  }
  function Hp(A, dkLen) {
    const A8 = u8(A);
    const T = new Uint32Array(1);
    const T8 = u8(T);
    T[0] = swap8IfBE(dkLen);
    if (dkLen <= 64)
      return blake2b.create({ dkLen }).update(T8).update(A8).digest();
    const out = new Uint8Array(dkLen);
    let V = blake2b.create({}).update(T8).update(A8).digest();
    let pos = 0;
    out.set(V.subarray(0, 32));
    pos += 32;
    for (; dkLen - pos > 64; pos += 32) {
      const Vh = blake2b.create({}).update(V);
      Vh.digestInto(V);
      Vh.destroy();
      out.set(V.subarray(0, 32), pos);
    }
    out.set(blake2b(V, { dkLen: dkLen - pos }), pos);
    clean2(V, T);
    return out;
  }
  function indexAlpha(r, s, laneLen, segmentLen, index, randL, sameLane = false) {
    let area;
    if (r === 0) {
      if (s === 0)
        area = index - 1;
      else if (sameLane)
        area = s * segmentLen + index - 1;
      else
        area = s * segmentLen + (index == 0 ? -1 : 0);
    } else if (sameLane)
      area = laneLen - segmentLen + index - 1;
    else
      area = laneLen - segmentLen + (index == 0 ? -1 : 0);
    const startPos = r !== 0 && s !== ARGON2_SYNC_POINTS - 1 ? (s + 1) * segmentLen : 0;
    const randLow = Math.imul(randL, randL);
    const randHigh = ((randL >>> 0) * (randL >>> 0) - (randLow >>> 0)) / 4294967296 + 0.5 | 0;
    const areaLow = Math.imul(area, randHigh);
    const areaHigh = ((area >>> 0) * (randHigh >>> 0) - (areaLow >>> 0)) / 4294967296 + 0.5 | 0;
    const rel = area - 1 - areaHigh;
    return (startPos + rel) % laneLen;
  }
  var maxUint32 = Math.pow(2, 32);
  var ARGON2_DEFAULT_MEMORY = 1024 ** 2;
  var ARGON2_DEFAULT_MAXMEM = ARGON2_DEFAULT_MEMORY * 1024;
  function isU32(num) {
    return Number.isSafeInteger(num) && num >= 0 && num < maxUint32;
  }
  function argon2Opts(opts = {}) {
    opts = checkOpts2({}, opts);
    const merged = {
      t: 3,
      m: ARGON2_DEFAULT_MEMORY,
      p: 1,
      version: 19,
      dkLen: 32,
      maxmem: ARGON2_DEFAULT_MAXMEM,
      asyncTick: 10
    };
    for (let [k, v] of Object.entries(opts))
      if (v !== void 0)
        merged[k] = v;
    const { dkLen, p, m, t, version, onProgress, asyncTick } = merged;
    if (!isU32(dkLen) || dkLen < 4)
      throw new Error('"dkLen" must be 4..');
    if (!isU32(p) || p < 1 || p >= Math.pow(2, 24))
      throw new Error('"p" must be 1..2^24');
    if (!isU32(m))
      throw new Error('"m" must be 0..2^32');
    if (!isU32(t) || t < 1)
      throw new Error('"t" (iterations) must be 1..2^32');
    if (onProgress !== void 0 && typeof onProgress !== "function")
      throw new Error('"onProgress" must be a function');
    anumber2(asyncTick, "asyncTick");
    if (!isU32(m) || m < 8 * p)
      throw new Error('"m" (memory) must be at least 8*p bytes');
    if (version !== 16 && version !== 19)
      throw new Error('"version" must be 0x10 or 0x13, got ' + version);
    return merged;
  }
  function argon2InitialHash(password, salt, type, opts) {
    const ownedInputs = [];
    const BUF = new Uint32Array(1);
    const BUF8 = u8(BUF);
    let h;
    let H0;
    let succeeded = false;
    const rememberOwned = (input, bytes) => {
      if (typeof input === "string")
        ownedInputs.push(bytes);
      return bytes;
    };
    try {
      const passwordBytes = rememberOwned(password, kdfInputToBytes(password, "password"));
      const saltBytes = rememberOwned(salt, kdfInputToBytes(salt, "salt"));
      if (!isU32(passwordBytes.length))
        throw new Error('"password" must be less of length 1..4Gb');
      if (!isU32(saltBytes.length) || saltBytes.length < 8)
        throw new Error('"salt" must be of length 8..4Gb');
      if (!Object.values(AT).includes(type))
        throw new Error('"type" was invalid');
      let { p, dkLen, m, t, version, key, personalization, maxmem, onProgress, asyncTick } = argon2Opts(opts);
      const keyInput = key;
      key = rememberOwned(keyInput, abytesOrZero(keyInput, "key"));
      const personalizationInput = personalization;
      personalization = rememberOwned(personalizationInput, abytesOrZero(personalizationInput, "personalization"));
      h = blake2b.create();
      for (let item of [p, dkLen, m, t, version, type]) {
        BUF[0] = swap8IfBE(item);
        h.update(BUF8);
      }
      for (let i of [passwordBytes, saltBytes, key, personalization]) {
        BUF[0] = swap8IfBE(i.length);
        h.update(BUF8).update(i);
      }
      H0 = new Uint32Array(18);
      h.digestInto(u8(H0));
      succeeded = true;
      return { H0, p, dkLen, m, t, version, maxmem, onProgress, asyncTick };
    } finally {
      if (h)
        h.destroy();
      clean2(BUF, ...ownedInputs);
      if (!succeeded && H0)
        clean2(H0);
    }
  }
  function argon2Init(password, salt, type, opts) {
    const { H0, p, dkLen, m, t, version, maxmem, onProgress, asyncTick } = argon2InitialHash(password, salt, type, opts);
    try {
      const lanes = p;
      const mP = 4 * p * Math.floor(m / (ARGON2_SYNC_POINTS * p));
      const laneLen = Math.floor(mP / p);
      const segmentLen = Math.floor(laneLen / ARGON2_SYNC_POINTS);
      const memUsed = mP * 1024;
      if (!isU32(maxmem))
        throw new Error('"maxmem" expected <2**32, got ' + maxmem);
      if (memUsed > maxmem)
        throw new Error('"maxmem" limit was hit: memUsed(mP*1024)=' + memUsed + ", maxmem=" + maxmem);
      const B = new Uint32Array(memUsed / 4);
      for (let l = 0; l < p; l++) {
        const i = 256 * laneLen * l;
        H0[17] = swap8IfBE(l);
        H0[16] = swap8IfBE(0);
        B.set(swap32IfBE2(u322(Hp(H0, 1024))), i);
        H0[16] = swap8IfBE(1);
        B.set(swap32IfBE2(u322(Hp(H0, 1024))), i + 256);
      }
      let perBlock = () => {
      };
      if (onProgress) {
        const totalBlock = t * ARGON2_SYNC_POINTS * p * segmentLen - 2 * p;
        const callbackPer = Math.max(Math.floor(totalBlock / 1e4), 1);
        let blockCnt = 0;
        perBlock = () => {
          blockCnt++;
          if (onProgress && (!(blockCnt % callbackPer) || blockCnt === totalBlock))
            onProgress(blockCnt / totalBlock);
        };
      }
      return { type, mP, p, t, version, B, laneLen, lanes, segmentLen, dkLen, perBlock, asyncTick };
    } finally {
      clean2(H0);
    }
  }
  function argon2Output(B, p, laneLen, dkLen) {
    const B_final = new Uint32Array(256);
    for (let l = 0; l < p; l++)
      for (let j = 0; j < 256; j++)
        B_final[j] ^= B[256 * (laneLen * l + laneLen - 1) + j];
    const res = Hp(swap32IfBE2(B_final), dkLen);
    clean2(B, B_final);
    return res;
  }
  function* argon2Blocks(ctx, address) {
    const { type, mP, p, t, version, B, laneLen, lanes, segmentLen, perBlock } = ctx;
    address[256 + 6] = mP;
    address[256 + 8] = t;
    address[256 + 10] = type;
    for (let r = 0; r < t; r++) {
      const needXor = r !== 0 && version === 19;
      address[256 + 0] = r;
      for (let s = 0; s < ARGON2_SYNC_POINTS; s++) {
        address[256 + 4] = s;
        const dataIndependent = type == AT.Argon2i || type == AT.Argon2id && r === 0 && s < 2;
        for (let l = 0; l < p; l++) {
          address[256 + 2] = l;
          address[256 + 12] = 0;
          let startPos = 0;
          if (r === 0 && s === 0) {
            startPos = 2;
            if (dataIndependent) {
              address[256 + 12]++;
              block(address, 256, 2 * 256, 0, false);
              block(address, 0, 2 * 256, 0, false);
            }
          }
          let offset = l * laneLen + s * segmentLen + startPos;
          for (let index = startPos; index < segmentLen; index++, offset++) {
            perBlock();
            const prev = offset % laneLen ? offset - 1 : offset + laneLen - 1;
            let randL, randH;
            if (dataIndependent) {
              let i128 = index % 128;
              if (i128 === 0) {
                address[256 + 12]++;
                block(address, 256, 2 * 256, 0, false);
                block(address, 0, 2 * 256, 0, false);
              }
              randL = address[2 * i128];
              randH = address[2 * i128 + 1];
            } else {
              const T = 256 * prev;
              randL = B[T];
              randH = B[T + 1];
            }
            const refLane = r === 0 && s === 0 ? l : randH % lanes;
            const refPos = indexAlpha(r, s, laneLen, segmentLen, index, randL, refLane == l);
            const refBlock = laneLen * refLane + refPos;
            block(B, 256 * prev, 256 * refBlock, offset * 256, needXor);
            yield;
          }
        }
      }
    }
    clean2(address);
  }
  function argon2(type, password, salt, opts) {
    const ctx = argon2Init(password, salt, type, opts);
    const blocks = argon2Blocks(ctx, new Uint32Array(3 * 256));
    while (!blocks.next().done) {
    }
    return argon2Output(ctx.B, ctx.p, ctx.laneLen, ctx.dkLen);
  }
  var argon2id = (password, salt, opts = {}) => argon2(AT.Argon2id, password, salt, opts);

  // ../../node_modules/@noble/hashes/hmac.js
  var _HMAC = class {
    oHash;
    iHash;
    blockLen;
    outputLen;
    canXOF = false;
    finished = false;
    destroyed = false;
    constructor(hash, key) {
      ahash(hash);
      abytes2(key, void 0, "key");
      this.iHash = hash.create();
      if (typeof this.iHash.update !== "function")
        throw new Error("expected Hash instance");
      this.blockLen = this.iHash.blockLen;
      this.outputLen = this.iHash.outputLen;
      const blockLen = this.blockLen;
      const pad = new Uint8Array(blockLen);
      pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
      for (let i = 0; i < pad.length; i++)
        pad[i] ^= 54;
      this.iHash.update(pad);
      this.oHash = hash.create();
      for (let i = 0; i < pad.length; i++)
        pad[i] ^= 54 ^ 92;
      this.oHash.update(pad);
      clean2(pad);
    }
    update(buf) {
      aexists2(this);
      this.iHash.update(buf);
      return this;
    }
    digestInto(out) {
      aexists2(this);
      aoutput2(out, this);
      this.finished = true;
      const buf = out.subarray(0, this.outputLen);
      this.iHash.digestInto(buf);
      this.oHash.update(buf);
      this.oHash.digestInto(buf);
      this.destroy();
    }
    digest() {
      const out = new Uint8Array(this.oHash.outputLen);
      this.digestInto(out);
      return out;
    }
    _cloneInto(to) {
      to ||= Object.create(Object.getPrototypeOf(this), {});
      const { oHash, iHash, finished, destroyed, blockLen, outputLen, canXOF } = this;
      to = to;
      to.finished = finished;
      to.destroyed = destroyed;
      to.blockLen = blockLen;
      to.outputLen = outputLen;
      to.canXOF = canXOF;
      to.oHash = oHash._cloneInto(to.oHash);
      to.iHash = iHash._cloneInto(to.iHash);
      return to;
    }
    clone() {
      return this._cloneInto();
    }
    destroy() {
      this.destroyed = true;
      this.oHash.destroy();
      this.iHash.destroy();
    }
  };
  var hmac = /* @__PURE__ */ (() => {
    const hmac_ = ((hash, key, message) => new _HMAC(hash, key).update(message).digest());
    hmac_.create = (hash, key) => new _HMAC(hash, key);
    return hmac_;
  })();

  // ../../node_modules/@noble/hashes/hkdf.js
  var HKDF_COUNTER = /* @__PURE__ */ Uint8Array.of(0);
  var EMPTY_BUFFER = /* @__PURE__ */ Uint8Array.of();
  function expand(hash, prk, info, length = 32, _recycled) {
    ahash(hash);
    anumber2(length, "length");
    abytes2(prk, void 0, "prk");
    const olen = hash.outputLen;
    if (prk.length < olen)
      throw new Error('"prk" must be at least HashLen octets');
    if (length > 255 * olen)
      throw new Error("Length must be <= 255*HashLen");
    const blocks = Math.ceil(length / olen);
    if (info === void 0)
      info = EMPTY_BUFFER;
    else
      abytes2(info, void 0, "info");
    if (!blocks) {
      if (_recycled)
        clean2(prk);
      return new Uint8Array();
    }
    const okm = _recycled && blocks === 1 ? prk : new Uint8Array(blocks * olen);
    const { iHash, oHash } = hmac.create(hash, prk);
    const T = _recycled ? prk : new Uint8Array(olen);
    const worker = blocks > 1 ? _recycled?.iHash || hash.create() : void 0;
    for (let counter = 0; counter < blocks - 1; counter++) {
      HKDF_COUNTER[0] = counter + 1;
      const iWork = iHash._cloneInto(worker);
      if (counter)
        iWork.update(T);
      iWork.update(info).update(HKDF_COUNTER).digestInto(T);
      oHash._cloneInto(worker).update(T).digestInto(T);
      okm.set(T, olen * counter);
    }
    HKDF_COUNTER[0] = blocks;
    if (blocks > 1)
      iHash.update(T);
    iHash.update(info).update(HKDF_COUNTER).digestInto(T);
    oHash.update(T).digestInto(T);
    okm.set(T, olen * (blocks - 1));
    iHash.destroy();
    oHash.destroy();
    worker?.destroy();
    if (T !== okm)
      clean2(T);
    clean2(HKDF_COUNTER);
    if (length === okm.length)
      return okm;
    const res = okm.slice(0, length);
    clean2(okm);
    return res;
  }
  var hkdf = (hash, ikm, salt, info, length) => {
    ahash(hash);
    if (salt === void 0)
      salt = new Uint8Array(hash.outputLen);
    const HMAC = hmac.create(hash, salt).update(ikm);
    return expand(hash, HMAC.digest(), info, length, HMAC);
  };

  // ../crypto/dist/CryptoProvider.js
  var nobleCryptoProvider = {
    randomBytes(length) {
      const out = new Uint8Array(length);
      globalThis.crypto.getRandomValues(out);
      return out;
    },
    sha256(data) {
      return sha256(data);
    },
    hmacSha256(key, data) {
      return hmac(sha256, key, data);
    },
    hkdfSha256(ikm, salt, info, length) {
      return hkdf(sha256, ikm, salt, info, length);
    },
    argon2id(password, salt, params) {
      return argon2id(password, salt, {
        m: params.m_kib,
        t: params.t,
        p: params.p,
        dkLen: params.dk_len
      });
    },
    xchachaSeal(key, nonce, aad, message) {
      return xchacha20poly1305(key, nonce, aad).encrypt(message);
    },
    xchachaOpen(key, nonce, aad, ciphertext) {
      return xchacha20poly1305(key, nonce, aad).decrypt(ciphertext);
    },
    ed25519PublicKey(seed) {
      return ed25519.getPublicKey(seed);
    },
    ed25519Sign(seed, message) {
      return ed25519.sign(message, seed);
    },
    ed25519Verify(publicKey, message, signature) {
      return ed25519.verify(signature, message, publicKey);
    }
  };
  var activo = nobleCryptoProvider;
  var cryptoProvider = () => activo;

  // ../crypto/dist/sync2.js
  var DOMAIN = "sync2";
  var NONCE_LEN = 24;
  var TAG_LEN = 16;
  var U8 = 255;
  var BLOB_ENVELOPE_BYTES = NONCE_LEN + TAG_LEN;
  var Sync2Error = class extends Error {
    code;
    constructor(code, message) {
      super(message);
      this.name = "Sync2Error";
      this.code = code;
    }
  };
  var concat = (...parts) => {
    let total = 0;
    for (const part of parts)
      total += part.length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  };
  var u82 = (value) => Uint8Array.of(value & U8);
  var u16be = (value) => {
    const out = new Uint8Array(2);
    new DataView(out.buffer).setUint16(0, value, false);
    return out;
  };
  var u64be = (value) => {
    const out = new Uint8Array(8);
    new DataView(out.buffer).setBigUint64(0, BigInt(value), false);
    return out;
  };
  var text = new TextEncoder();
  var nfkc = (value) => value.normalize("NFKC");
  var splitEnvelope = (stored, what) => {
    if (stored.length < NONCE_LEN + TAG_LEN) {
      throw new Sync2Error("invalid_length", `${what}: sobre demasiado corto`);
    }
    return [stored.subarray(0, NONCE_LEN), stored.subarray(NONCE_LEN)];
  };
  var identityFromSeed = (seed) => ({
    seed,
    pubkey: cryptoProvider().ed25519PublicKey(seed)
  });
  var identityFromSubkeys = (keys) => identityFromSeed(keys.sign);
  var nonceBody = (keys, plaintext) => cryptoProvider().hmacSha256(keys.nonce, plaintext).subarray(0, NONCE_LEN);
  var encryptBlob = (keys, plaintext) => {
    const nonce = nonceBody(keys, plaintext);
    const ciphertext = cryptoProvider().xchachaSeal(keys.content, nonce, new Uint8Array(0), plaintext);
    return concat(nonce, ciphertext);
  };
  var decryptBlob = (keys, stored) => {
    const [nonce, ciphertext] = splitEnvelope(stored, "blob");
    try {
      return cryptoProvider().xchachaOpen(keys.content, nonce, new Uint8Array(0), ciphertext);
    } catch {
      throw new Sync2Error("authentication_failed", "el blob no autentica");
    }
  };
  var blobId = (blob) => cryptoProvider().sha256(blob);
  var pathId = (keys, path) => cryptoProvider().hmacSha256(keys.path, text.encode(nfkc(path)));
  var pathEnc = (keys, path) => {
    const normalized = text.encode(nfkc(path));
    const id = cryptoProvider().hmacSha256(keys.path, normalized);
    const nonce = cryptoProvider().randomBytes(NONCE_LEN);
    const ciphertext = cryptoProvider().xchachaSeal(keys.path, nonce, id, normalized);
    return concat(nonce, ciphertext);
  };
  var decryptPathEnc = (keys, stored, expectedPathId) => {
    const [nonce, ciphertext] = splitEnvelope(stored, "path_enc");
    return decryptPathEncWithNonce(keys, nonce, expectedPathId, ciphertext);
  };
  var decryptPathEncWithNonce = (keys, nonce, expectedPathId, ciphertext) => {
    try {
      const plaintext = cryptoProvider().xchachaOpen(keys.path, nonce, expectedPathId, ciphertext);
      return new TextDecoder().decode(plaintext);
    } catch {
      throw new Sync2Error("authentication_failed", "el path no autentica");
    }
  };
  var tMac = (identity, vaultUid, pathIdValue, blobIdValue, epoch) => {
    const message = concat(text.encode(`${DOMAIN}/bind`), vaultUid, pathIdValue, blobIdValue, u16be(epoch));
    return cryptoProvider().ed25519Sign(identity.seed, message);
  };
  var msgRec = (pathIdValue, blobIdValue, tMacValue, opCode, size, mtime, expectedRev, operationId, epoch) => concat(text.encode(`${DOMAIN}/rec`), u82(opCode), pathIdValue, blobIdValue, tMacValue, u64be(size), u64be(mtime), u64be(expectedRev), operationId, u16be(epoch));
  var signRecord = (identity, pathIdValue, blobIdValue, tMacValue, opCode, size, mtime, expectedRev, operationId, epoch) => cryptoProvider().ed25519Sign(identity.seed, msgRec(pathIdValue, blobIdValue, tMacValue, opCode, size, mtime, expectedRev, operationId, epoch));
  var proofMsg = (vaultDbId, deviceId, challenge) => concat(challenge, u64be(vaultDbId), u64be(deviceId));
  var signProof = (identity, vaultDbId, deviceId, challenge) => cryptoProvider().ed25519Sign(identity.seed, proofMsg(vaultDbId, deviceId, challenge));
  var bytesToUuid = (bytes) => {
    if (bytes.length !== 16)
      throw new Sync2Error("invalid_length", "UUID: se esperan 16 bytes");
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };

  // src/apply.ts
  function intentIdFor(candidate) {
    const digest = cryptoProvider().sha256(
      textEncoder.encode(`apply:${candidate.pathId}:${candidate.rev}:${candidate.blobId}`)
    );
    return bytesToUuid(digest.subarray(0, 16));
  }
  function createIntent(candidate) {
    if (!Number.isInteger(candidate.rev) || candidate.rev < 0) {
      throw new Error(`rev inv\xE1lida: ${String(candidate.rev)}`);
    }
    if (candidate.pathId.length === 0) {
      throw new Error("pathId es obligatorio");
    }
    if (candidate.blobId.length === 0 && candidate.deleted !== true) {
      throw new Error("blobId es obligatorio salvo en un borrado");
    }
    return {
      intentId: intentIdFor(candidate),
      pathId: candidate.pathId,
      rev: candidate.rev,
      blobId: candidate.blobId,
      state: "pending",
      path: candidate.path,
      kind: candidate.kind,
      deleted: candidate.deleted ?? false,
      contentHash: candidate.contentHash ?? null,
      tempName: candidate.tempName,
      createdAt: Date.now()
    };
  }

  // src/merge.ts
  var import_diff_match_patch = __toESM(require_diff_match_patch(), 1);
  function cambiosDe(dmp, base, texto) {
    const cambios = [];
    let pendiente = null;
    let pos = 0;
    const cerrar = () => {
      if (pendiente !== null) {
        cambios.push(pendiente);
        pendiente = null;
      }
    };
    for (const [op, chunk] of dmp.diff_main(base, texto)) {
      if (op === 0) {
        cerrar();
        pos += chunk.length;
        continue;
      }
      if (op === -1) {
        if (pendiente === null) {
          pendiente = { inicio: pos, fin: pos + chunk.length, texto: "" };
        } else {
          pendiente.fin = pos + chunk.length;
        }
        pos += chunk.length;
        continue;
      }
      if (pendiente === null) {
        pendiente = { inicio: pos, fin: pos, texto: chunk };
      } else {
        pendiente.texto += chunk;
      }
    }
    cerrar();
    return cambios;
  }
  function seSolapan(a, b, largoBase) {
    for (const p of a) {
      for (const q of b) {
        const pEsPunto = p.inicio === p.fin;
        const qEsPunto = q.inicio === q.fin;
        if (pEsPunto && qEsPunto) {
          if (p.inicio === q.inicio) return true;
          continue;
        }
        if (pEsPunto) {
          if (p.inicio >= q.inicio && p.inicio < q.fin) return true;
          if (p.inicio === q.fin && p.inicio < largoBase) return true;
          continue;
        }
        if (qEsPunto) {
          if (q.inicio >= p.inicio && q.inicio < p.fin) return true;
          if (q.inicio === p.fin && q.inicio < largoBase) return true;
          continue;
        }
        if (p.inicio < q.fin && q.inicio < p.fin) return true;
      }
    }
    return false;
  }
  function mergeDeTexto(base, ours, theirs) {
    if (base === ours) return { tipo: "merge", texto: theirs };
    if (base === theirs) return { tipo: "merge", texto: ours };
    if (ours === theirs) return { tipo: "merge", texto: ours };
    const dmp = new import_diff_match_patch.default();
    const cambiosOurs = cambiosDe(dmp, base, ours);
    const cambiosTheirs = cambiosDe(dmp, base, theirs);
    if (cambiosOurs.length === 0) return { tipo: "merge", texto: theirs };
    if (cambiosTheirs.length === 0) return { tipo: "merge", texto: ours };
    if (seSolapan(cambiosOurs, cambiosTheirs, base.length)) return { tipo: "conflicto" };
    const todos = [...cambiosOurs, ...cambiosTheirs].sort((a, b) => a.inicio - b.inicio);
    let fusionado = "";
    let cursor = 0;
    for (const cambio of todos) {
      fusionado += base.slice(cursor, cambio.inicio) + cambio.texto;
      cursor = cambio.fin;
    }
    fusionado += base.slice(cursor);
    return { tipo: "merge", texto: fusionado };
  }
  function esMergeablePorTipo(path) {
    const nombre = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
    if (/\.(canvas|base)$/.test(nombre)) return false;
    return /\.(md|markdown|txt|json|css|js|ts|yml|yaml|csv)$/.test(nombre);
  }

  // src/vault-path.ts
  var CARACTERES_VETADOS = /[<>:"|?*\\\u0000-\u001f]/;
  var RESERVADOS = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
  var MAX_SEGMENTO_BYTES = 255;
  var MAX_RUTA_CHARS = 1e3;
  var codificador = new TextEncoder();
  function validarRutaDeVault(path) {
    if (typeof path !== "string") return { ok: false, motivo: "no es texto" };
    if (path === "") return { ok: true };
    if (path.length > MAX_RUTA_CHARS) return { ok: false, motivo: "ruta demasiado larga" };
    if (path.startsWith("/")) return { ok: false, motivo: "ruta absoluta (empieza con /)" };
    if (/^[A-Za-z]:/.test(path)) return { ok: false, motivo: "ruta absoluta (letra de unidad)" };
    const segmentos = path.split("/");
    for (const segmento of segmentos) {
      if (segmento === "") return { ok: false, motivo: "segmento vac\xEDo (barra duplicada o final)" };
      if (segmento === "." || segmento === "..") return { ok: false, motivo: "traves\xEDa en la ruta" };
      if (CARACTERES_VETADOS.test(segmento)) {
        return { ok: false, motivo: `car\xE1cter vetado en \xAB${segmento}\xBB` };
      }
      if (segmento.endsWith(".") || segmento.endsWith(" ")) {
        return { ok: false, motivo: `\xAB${segmento}\xBB termina en punto o espacio` };
      }
      if (RESERVADOS.test(segmento)) {
        return { ok: false, motivo: `nombre reservado del sistema: \xAB${segmento}\xBB` };
      }
      if (codificador.encode(segmento).length > MAX_SEGMENTO_BYTES) {
        return { ok: false, motivo: `segmento de m\xE1s de ${MAX_SEGMENTO_BYTES} bytes` };
      }
    }
    return { ok: true };
  }
  function nombreBase(path) {
    const corte = path.lastIndexOf("/");
    return corte < 0 ? path : path.slice(corte + 1);
  }
  function colisionDeCase(nombres, objetivo) {
    const plegado = (s) => s.normalize("NFC").toLowerCase();
    const buscado = plegado(objetivo);
    for (const nombre of nombres) {
      if (nombre !== objetivo && plegado(nombre) === buscado) return nombre;
    }
    return null;
  }

  // src/apply-runner.ts
  var sha256Hex = (bytes) => toHex(cryptoProvider().sha256(bytes));
  var dirVault = (path) => {
    const corte = path.lastIndexOf("/");
    return corte < 0 ? "." : path.slice(0, corte);
  };
  async function evaluarGuard(deps, revision, hashRemoto) {
    const { store: store2, port } = deps;
    if (revision.deleted && revision.path === "") return { verdict: "already-gone" };
    const base = await store2.getBase(revision.pathId);
    const actual = await port.stat(revision.path).catch(() => null);
    if (revision.kind === "folder") {
      if (actual && actual.isFile) return { verdict: "blocked", reason: "un archivo local ocupa el camino" };
      return { verdict: "safe" };
    }
    const hashActual = actual?.isFile ? sha256Hex(await port.read(revision.path)) : null;
    if (revision.deleted) {
      if (!actual) return { verdict: "already-gone" };
      if (base?.contentHash && hashActual === base.contentHash) return { verdict: "safe" };
      return { verdict: "blocked", reason: "borrado remoto contra contenido local distinto de la base" };
    }
    if (!actual) {
      if (base) return { verdict: "blocked", reason: "el archivo local desapareci\xF3 respecto de la base" };
      return { verdict: "safe" };
    }
    if (actual.isDirectory) return { verdict: "blocked", reason: "un directorio local ocupa el camino" };
    const hashEsperado = revision.contentHash ?? hashRemoto;
    if (hashEsperado !== null && hashActual === hashEsperado) return { verdict: "identical" };
    if (!base) return { verdict: "blocked", reason: "existe localmente y no hay base (dos creaciones)" };
    if (!base.contentHash) return { verdict: "blocked", reason: "sin hash en la base: no puedo descartar una edici\xF3n local" };
    if (hashActual === base.contentHash) return { verdict: "safe" };
    return { verdict: "blocked", reason: "hay una edici\xF3n local posterior a la base" };
  }
  async function intentarFusionar(deps, revision, plaintextRemoto, hashRemoto, reason) {
    const { store: store2, port, keys, conn } = deps;
    if (reason !== "hay una edici\xF3n local posterior a la base") return null;
    if (conn === void 0 || plaintextRemoto === null || hashRemoto === null) return null;
    if (revision.kind !== "file" || revision.deleted) return null;
    if (!esMergeablePorTipo(revision.path)) return null;
    const base = await store2.getBase(revision.pathId);
    if (!base?.blobId) return null;
    try {
      const storedBase = await conn.getBlob(base.blobId);
      if (sha256Hex(storedBase) !== base.blobId) return null;
      const dec = new TextDecoder("utf-8", { fatal: true });
      const textoBase = dec.decode(decryptBlob(keys, storedBase));
      const bytesOurs = await port.read(revision.path);
      const oursHash = sha256Hex(bytesOurs);
      const textoOurs = dec.decode(bytesOurs);
      const textoTheirs = dec.decode(plaintextRemoto);
      const resultado = mergeDeTexto(textoBase, textoOurs, textoTheirs);
      if (resultado.tipo === "conflicto") return null;
      return { fusion: new TextEncoder().encode(resultado.texto), oursHash, hashRemoto };
    } catch {
      return null;
    }
  }
  async function publicarFusion(deps, intent, revision, fusion) {
    const { store: store2, port } = deps;
    const dir = dirVault(revision.path);
    if (dir !== ".") await port.mkdirp(dir);
    const { tempName } = await port.writeTemp(dir, fusion.fusion);
    intent = {
      ...intent,
      tempName,
      contentHash: sha256Hex(fusion.fusion),
      state: "verified",
      mergeBase: {
        rev: revision.rev,
        blobId: revision.blobId,
        contentHash: fusion.hashRemoto,
        oursHash: fusion.oursHash
      }
    };
    await store2.putIntent(intent);
    await port.rename(tempName, revision.path);
    await commitDesdeIntento(deps, intent);
    return {
      status: "merged",
      intentId: intent.intentId,
      reason: "se fusionaron las ediciones de los dos dispositivos"
    };
  }
  async function applyRevision(deps, revision, stored, opciones = {}) {
    const { store: store2, port } = deps;
    if (!revision.deleted && revision.kind === "file") {
      if (!stored) throw new Error("apply: falta el blob almacenado");
      const realBlobId = sha256Hex(stored);
      if (revision.blobId && realBlobId !== revision.blobId) {
        throw new Error(`apply: blob_id no coincide (${realBlobId} != ${revision.blobId})`);
      }
    }
    let intent = createIntent({
      pathId: revision.pathId,
      rev: revision.rev,
      blobId: revision.blobId ?? "",
      path: revision.path,
      kind: revision.kind,
      deleted: revision.deleted,
      contentHash: revision.contentHash ?? null
    });
    await store2.putIntent(intent);
    if (revision.path !== "") {
      const validez = validarRutaDeVault(revision.path);
      if (!validez.ok) {
        intent = { ...intent, state: "blocked", reason: `ruta rechazada: ${validez.motivo}` };
        await store2.putIntent(intent);
        return { status: "blocked", intentId: intent.intentId, reason: intent.reason };
      }
    }
    let plaintext = null;
    let hashVerificado = null;
    if (!revision.deleted && revision.kind === "file") {
      plaintext = decryptBlob(deps.keys, stored);
      hashVerificado = sha256Hex(plaintext);
      if (revision.contentHash && hashVerificado !== revision.contentHash) {
        await store2.deleteIntent(intent.intentId);
        throw new Error(
          `apply: content_hash no coincide (${hashVerificado} != ${revision.contentHash})`
        );
      }
    }
    const guard = await evaluarGuard(deps, revision, hashVerificado);
    let verdict = guard.verdict;
    if (guard.verdict === "blocked") {
      if (opciones.forzar !== true) {
        const fusion = await intentarFusionar(deps, revision, plaintext, hashVerificado, guard.reason);
        if (fusion !== null) {
          return publicarFusion(deps, intent, revision, fusion);
        }
        intent = { ...intent, state: "blocked", reason: guard.reason };
        await store2.putIntent(intent);
        return { status: "blocked", intentId: intent.intentId, reason: guard.reason };
      }
      verdict = "safe";
    }
    if (!revision.deleted && revision.path !== "" && verdict === "safe") {
      const dir = dirVault(revision.path);
      try {
        const entradas = await port.list(dir);
        const choque = colisionDeCase(
          entradas.map((entrada) => entrada.name),
          nombreBase(revision.path)
        );
        if (choque !== null) {
          intent = {
            ...intent,
            state: "blocked",
            reason: `colisi\xF3n de case: \xAB${choque}\xBB ocupa el nombre`
          };
          await store2.putIntent(intent);
          return { status: "blocked", intentId: intent.intentId, reason: intent.reason };
        }
      } catch {
      }
    }
    if (revision.kind === "file") {
      if (revision.deleted) {
        if (verdict !== "already-gone") await port.unlink(revision.path);
      } else if (verdict !== "identical") {
        const dir = dirVault(revision.path);
        if (dir !== ".") await port.mkdirp(dir);
        const { tempName } = await port.writeTemp(dir, plaintext);
        intent = { ...intent, tempName, contentHash: hashVerificado, state: "verified" };
        await store2.putIntent(intent);
        await port.rename(tempName, revision.path);
      }
    } else if (!revision.deleted) {
      await port.mkdirp(revision.path);
    }
    await store2.completeApply({
      intentId: intent.intentId,
      base: {
        pathId: revision.pathId,
        rev: revision.rev,
        blobId: revision.blobId,
        contentHash: revision.deleted ? null : revision.contentHash ?? hashVerificado
      },
      index: {
        pathId: revision.pathId,
        path: revision.path,
        kind: revision.kind,
        deleted: revision.deleted,
        rev: revision.rev,
        blobId: revision.blobId,
        contentHash: revision.deleted ? null : revision.contentHash ?? hashVerificado,
        size: plaintext ? plaintext.length : null,
        mtime: null
      },
      checkpoint: { since: revision.rev, minRev: null }
    });
    return { status: "applied", intentId: intent.intentId };
  }
  async function commitDesdeIntento(deps, intent) {
    const { store: store2, port } = deps;
    const stat = intent.path ? await port.stat(intent.path).catch(() => null) : null;
    const destino = intent.mergeBase ? {
      rev: intent.mergeBase.rev,
      blobId: intent.mergeBase.blobId,
      contentHash: intent.mergeBase.contentHash
    } : {
      rev: intent.rev,
      blobId: intent.blobId === "" ? null : intent.blobId,
      contentHash: intent.deleted ? null : intent.contentHash ?? null
    };
    await store2.completeApply({
      intentId: intent.intentId,
      base: { pathId: intent.pathId, ...destino },
      index: {
        pathId: intent.pathId,
        path: intent.path ?? "",
        kind: intent.kind ?? "file",
        deleted: intent.deleted === true,
        ...destino,
        size: stat?.size ?? null,
        mtime: null
      },
      checkpoint: { since: intent.rev, minRev: null }
    });
  }
  async function recoverApplies(deps) {
    const { store: store2, port } = deps;
    const reporte = { completed: 0, cleaned: 0, blocked: 0 };
    const intents = await store2.listIntents();
    for (const intent of intents) {
      if (intent.state === "blocked") continue;
      if (intent.state === "pending") {
        if (intent.tempName) await port.unlink(intent.tempName).catch(() => void 0);
        await store2.deleteIntent(intent.intentId);
        reporte.cleaned += 1;
        continue;
      }
      if (!intent.tempName || !intent.path || !intent.contentHash) {
        await store2.putIntent({ ...intent, state: "blocked", reason: "intenci\xF3n verificada incompleta" });
        reporte.blocked += 1;
        continue;
      }
      const destino = await port.stat(intent.path).catch(() => null);
      const hashDestino = destino?.isFile ? sha256Hex(await port.read(intent.path)) : null;
      if (hashDestino !== null && hashDestino === intent.contentHash) {
        await commitDesdeIntento(deps, intent);
        reporte.completed += 1;
        continue;
      }
      const temp = await port.stat(intent.tempName).catch(() => null);
      if (temp?.isFile) {
        const hashTemp = sha256Hex(await port.read(intent.tempName));
        if (hashTemp !== intent.contentHash) {
          await port.unlink(intent.tempName).catch(() => void 0);
          await store2.putIntent({ ...intent, state: "blocked", reason: "temporal no coincide con el esperado" });
          reporte.blocked += 1;
          continue;
        }
        const base = await store2.getBase(intent.pathId);
        const destinoOk = intent.mergeBase ? hashDestino === intent.mergeBase.oursHash : hashDestino === null ? base === null : base?.contentHash != null && hashDestino === base.contentHash;
        if (!destinoOk) {
          await store2.putIntent({ ...intent, state: "blocked", reason: "destino con cambios locales: no se pisa" });
          reporte.blocked += 1;
          continue;
        }
        await port.rename(intent.tempName, intent.path);
        await commitDesdeIntento(deps, intent);
        reporte.completed += 1;
        continue;
      }
      await store2.putIntent({ ...intent, state: "blocked", reason: "sin temporal ni destino esperado" });
      reporte.blocked += 1;
    }
    return reporte;
  }

  // src/file-port.ts
  var HttpFileSystemPort = class {
    constructor(baseUrl) {
      this.baseUrl = baseUrl;
    }
    baseUrl;
    async op(nombre, params) {
      const respuesta = await fetch(`${this.baseUrl}/fs/${nombre}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(params)
      });
      const datos = await respuesta.json();
      if (!datos.ok) throw new Error(`fs ${nombre}: ${datos.error?.message ?? "error desconocido"}`);
      return datos.result;
    }
    stat(relPath) {
      return this.op("stat", { path: relPath });
    }
    async read(relPath) {
      const result = await this.op("read", { path: relPath });
      return b64Decode(result.b64);
    }
    writeTemp(relDir, bytes) {
      return this.op("writeTemp", { dir: relDir, b64: b64Encode(bytes) });
    }
    async rename(fromRel, toRel) {
      await this.op("rename", { from: fromRel, to: toRel });
    }
    async unlink(relPath) {
      await this.op("unlink", { path: relPath });
    }
    async mkdirp(relPath) {
      await this.op("mkdirp", { path: relPath });
    }
    list(relDir) {
      return this.op("list", { path: relDir });
    }
  };

  // src/history.ts
  var import_diff_match_patch2 = __toESM(require_diff_match_patch(), 1);
  async function historiaDeArchivo(opciones) {
    const { conn, keys, ruta } = opciones;
    const pathIdHex = toHex(pathId(keys, ruta));
    const pagina = await conn.historial(pathIdHex, opciones.before, opciones.limit ?? 50);
    const items = pagina.items.map((item) => {
      let nombre = null;
      if (item.path_enc) {
        try {
          nombre = decryptPathEnc(keys, b64Decode(item.path_enc), fromHex(item.path_id));
        } catch {
          nombre = null;
        }
      }
      return {
        rev: item.rev,
        op: item.op,
        pathId: item.path_id,
        ruta: nombre,
        blobId: item.blob_hash ?? null,
        size: item.size ?? null,
        deviceId: item.device_id ?? null,
        epoch: item.epoch,
        ts: item.ts
      };
    });
    return { items, nextBefore: pagina.next_before, minRev: pagina.min_rev };
  }
  async function contenidoDeRevision(opciones) {
    const { conn, keys, blobId: blobId2 } = opciones;
    const bytes = await conn.getBlob(blobId2);
    const calculado = toHex(blobId(bytes));
    if (calculado !== blobId2.toLowerCase()) {
      throw new Error(
        `el blob descargado no coincide con su hash (esperado ${blobId2}, real ${calculado})`
      );
    }
    return decryptBlob(keys, bytes);
  }
  function diffDeTextos(anterior, nuevo) {
    if (anterior === nuevo) return "";
    const dmp = new import_diff_match_patch2.default();
    const {
      chars1: charsAnterior,
      chars2: charsNuevo,
      lineArray: lineas
    } = dmp.diff_linesToChars_(anterior, nuevo);
    const diffs = dmp.diff_main(charsAnterior, charsNuevo, false);
    dmp.diff_charsToLines_(diffs, lineas);
    const salida = [];
    for (const [operacion, texto] of diffs) {
      if (operacion === 0) continue;
      const prefijo = operacion === 1 ? "+" : "-";
      const contenido = texto.endsWith("\n") ? texto.slice(0, -1) : texto;
      if (contenido === "") continue;
      for (const linea of contenido.split("\n")) {
        salida.push(`${prefijo} ${linea}`);
      }
    }
    return salida.join("\n");
  }

  // src/outbox.ts
  var canonicalPayload = (req) => JSON.stringify({
    kind: req.kind,
    path: req.path,
    pathId: req.pathId,
    prevPathId: req.prevPathId ?? null,
    folder: req.folder === true,
    expectedRev: req.expectedRev,
    contentHash: req.contentHash ?? null
  });
  function operationIdFor(req) {
    const digest = cryptoProvider().sha256(textEncoder.encode(canonicalPayload(req)));
    return bytesToUuid(digest.subarray(0, 16));
  }
  function prepareOutboxEntry(req) {
    if (!Number.isInteger(req.expectedRev) || req.expectedRev < 0) {
      throw new Error(`expectedRev inv\xE1lido: ${String(req.expectedRev)}`);
    }
    if (req.pathId.length === 0 || req.path.length === 0) {
      throw new Error("path y pathId son obligatorios");
    }
    const esArchivo = req.folder !== true;
    if (req.kind === "add" || req.kind === "mod") {
      if (esArchivo && (req.contentB64 == null || req.contentHash == null)) {
        throw new Error(`outbox ${req.kind}: un archivo necesita contentB64 y contentHash (snapshot recuperable)`);
      }
    }
    if (req.kind === "del" && (req.contentB64 != null || req.contentHash != null)) {
      throw new Error("outbox del: no lleva contenido");
    }
    if (req.kind === "move" && !req.prevPathId) {
      throw new Error("outbox move: falta prevPathId");
    }
    let snapshot = null;
    if (req.contentB64 != null) {
      const bytes = b64Decode(req.contentB64);
      const real = toHex(cryptoProvider().sha256(bytes));
      if (real !== req.contentHash) {
        throw new Error(`el hash declarado no coincide con el contenido (declarado ${req.contentHash}, real ${real})`);
      }
      snapshot = new Blob([new Uint8Array(bytes).buffer]);
    }
    return {
      operationId: operationIdFor(req),
      kind: req.kind,
      pathId: req.pathId,
      path: req.path,
      prevPathId: req.prevPathId ?? void 0,
      expectedRev: req.expectedRev,
      queuedAt: req.queuedAt ?? Date.now(),
      snapshot,
      snapshotHash: req.contentHash ?? null,
      state: "pending"
    };
  }

  // src/SyncFilter.ts
  var PREFIJO_TEMPORAL = ".ovaultd-tmp-";
  var ID_DEL_PLUGIN_DE_SYNC = "ovaultd";
  var CARPETAS_VETADAS = /* @__PURE__ */ new Map([
    [".trash", "papelera local del vault"],
    [".git", "repositorio git anidado"],
    ["node_modules", "dependencias de node"]
  ]);
  var CONFIG_PORTABLE = [
    /^appearance(\.json)?$/,
    // tema, tamaño de letra, acentos visuales
    /^core-plugins\.json$/,
    // qué plugins del núcleo están habilitados
    /^hotkeys\.json$/,
    // atajos de teclado (portables: no llevan rutas absolutas)
    /^snippets\/.+/,
    // CSS propio del vault
    /^themes\/.+/,
    // temas instalados como archivos
    /^plugins\/[^/]+\/manifest\.json$/
    // la identidad de cada plugin, NO su data.json
  ];
  function esConfigPortable(dentroDelConfig) {
    return CONFIG_PORTABLE.some((patron) => patron.test(dentroDelConfig));
  }
  function esContenedorDeConfig(dentro) {
    if (dentro === "") return true;
    if (dentro === "snippets" || dentro === "themes" || dentro === "plugins") return true;
    const partes = dentro.split("/");
    return partes.length === 2 && partes[0] === "plugins";
  }
  function motivoDeExclusion(path, configDir = ".obsidian") {
    const segmentos = path.split("/");
    for (const segmento of segmentos) {
      if (segmento.startsWith(PREFIJO_TEMPORAL)) {
        return "temporal del motor";
      }
      const motivo = CARPETAS_VETADAS.get(segmento);
      if (motivo !== void 0) return motivo;
    }
    const nombre = segmentos[segmentos.length - 1];
    if (/^workspace(-mobile)?\.json$/.test(nombre)) {
      return "workspace por dispositivo";
    }
    const i = segmentos.indexOf(configDir);
    if (i !== -1) {
      const dentro = segmentos.slice(i + 1).join("/");
      if (esContenedorDeConfig(dentro)) return null;
      if (dentro === `plugins/${ID_DEL_PLUGIN_DE_SYNC}/manifest.json`) {
        return "manifest del plugin de sync (lo actualiza la tienda en cada dispositivo)";
      }
      return esConfigPortable(dentro) ? null : "configuraci\xF3n del vault (fuera de la lista blanca)";
    }
    return null;
  }
  var estaExcluido = (path, configDir = ".obsidian") => motivoDeExclusion(path, configDir) !== null;

  // src/scan.ts
  async function escanearVault(port, keys, dir = "") {
    const salida = [];
    const recorrer = async (relDir) => {
      const listado = await port.list(relDir === "" ? "." : relDir);
      for (const entrada of listado) {
        const rel = relDir === "" ? entrada.name : `${relDir}/${entrada.name}`;
        if (estaExcluido(rel)) continue;
        if (entrada.isDirectory) {
          await recorrer(rel);
          continue;
        }
        if (!entrada.isFile) continue;
        const bytes = await port.read(rel);
        const stat = await port.stat(rel);
        salida.push({
          path: rel,
          pathId: toHex(pathId(keys, rel)),
          contentHash: toHex(cryptoProvider().sha256(bytes)),
          size: bytes.length,
          mtimeMs: stat?.mtimeMs ?? 0
        });
      }
    };
    await recorrer(dir);
    salida.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    return salida;
  }
  async function diffLocal(store2, entradas) {
    const base = new Map((await store2.listBase()).map((entrada) => [entrada.pathId, entrada]));
    const index = new Map((await store2.listIndex()).map((entrada) => [entrada.pathId, entrada]));
    const pendientes = new Set(
      (await store2.listOutbox()).filter((entrada) => entrada.state !== "confirmed").map((entrada) => entrada.pathId)
    );
    const enDisco = /* @__PURE__ */ new Set();
    const diff = { nuevos: [], modificados: [], borrados: [], sinCambios: 0, yaEncolados: 0 };
    for (const archivo of entradas) {
      enDisco.add(archivo.pathId);
      const baseEntry = base.get(archivo.pathId);
      if (!baseEntry || baseEntry.contentHash == null) {
        if (pendientes.has(archivo.pathId)) {
          diff.yaEncolados += 1;
        } else {
          diff.nuevos.push(archivo);
        }
        continue;
      }
      if (baseEntry.contentHash === archivo.contentHash) {
        diff.sinCambios += 1;
        continue;
      }
      if (pendientes.has(archivo.pathId)) {
        diff.yaEncolados += 1;
      } else {
        diff.modificados.push(archivo);
      }
    }
    for (const [pathIdHex, baseEntry] of base) {
      if (enDisco.has(pathIdHex) || baseEntry.contentHash == null) continue;
      const indexEntry = index.get(pathIdHex);
      if (indexEntry?.deleted === true) continue;
      if (indexEntry?.path && estaExcluido(indexEntry.path)) continue;
      if (pendientes.has(pathIdHex)) {
        diff.yaEncolados += 1;
        continue;
      }
      diff.borrados.push({ pathId: pathIdHex, path: indexEntry?.path });
    }
    return diff;
  }

  // src/SyncConnection.ts
  var SyncHttpError = class extends Error {
    status;
    code;
    constructor(status, code, detail) {
      super(`HTTP ${status}${code ? ` (${code})` : ""}${detail ? `: ${detail}` : ""}`);
      this.name = "SyncHttpError";
      this.status = status;
      this.code = code;
    }
  };
  var SyncRejectedError = class extends Error {
    code;
    constructor(code, detail) {
      super(`server rechaz\xF3${code ? ` (${code})` : ""}${detail ? `: ${detail}` : ""}`);
      this.name = "SyncRejectedError";
      this.code = code;
    }
  };
  var SyncConflictError = class extends Error {
    conflicto;
    constructor(conflicto) {
      super(
        `conflicto en ${conflicto.path_id} (base ${conflicto.base_rev}, server ${conflicto.server_rev}, cliente ${conflicto.client_rev})`
      );
      this.name = "SyncConflictError";
      this.conflicto = conflicto;
    }
  };
  var b64url = (texto) => {
    const bytes = new TextEncoder().encode(texto);
    let binario = "";
    for (const byte of bytes) binario += String.fromCharCode(byte);
    return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  var SyncConnection = class {
    constructor(opciones) {
      this.opciones = opciones;
    }
    opciones;
    ws = null;
    espera = null;
    /** Frames `notify`/`ack` que llegaron fuera de una espera (nudge vivo; se drenan del server igual). */
    notificaciones = [];
    get base() {
      return this.opciones.baseUrl.replace(/\/+$/, "");
    }
    headers() {
      return { authorization: `Bearer ${this.opciones.token}` };
    }
    wsUrl() {
      const url = new URL(this.base);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/api/v1/ws";
      url.search = "";
      return url.toString();
    }
    /** Abre la sesión: upgrade + handshake completo. Devuelve el `head_rev` del server. */
    async open({ since }) {
      if (this.ws) throw new Error("SyncConnection: ya est\xE1 abierta");
      const bearer = `ovaultd.bearer.${b64url(this.opciones.token)}`;
      const ws = new WebSocket(this.wsUrl(), ["ovaultd.v1", bearer]);
      this.ws = ws;
      await new Promise((resolver, rechazar) => {
        ws.onopen = () => resolver();
        ws.onerror = () => rechazar(new Error(`WS: no se pudo abrir ${this.wsUrl()}`));
      });
      ws.onmessage = (evento) => this.onMensaje(evento);
      ws.onclose = () => this.onCierre();
      this.enviar({
        t: "hello",
        proto: 1,
        vault: this.opciones.vault,
        device: this.opciones.device,
        since
      });
      const helloOk = await this.esperar(["hello_ok"]);
      const challenge = b64Decode(helloOk.challenge);
      const proof = signProof(
        identityFromSubkeys(this.opciones.keys),
        this.opciones.vault,
        this.opciones.device,
        challenge
      );
      this.enviar({ t: "auth", proof: b64Encode(proof) });
      await this.esperar(["auth_ok"]);
      return { headRev: helloOk.head_rev };
    }
    /** Delta HTTP desde `since` (revisión completa, con cursor). */
    async pull(since, limit = 100) {
      const respuesta = await fetch(
        `${this.base}/api/v1/vaults/${this.opciones.vault}/changes?since=${since}&limit=${limit}`,
        { headers: this.headers() }
      );
      return this.json(respuesta);
    }
    /**
     * Historia de un archivo (LECTURA pura del oplog): página por `path_id` (hex), más
     * nueva primero, con la cadena de renames ya resuelta por el server. `before` acota
     * (`rev < before`). Nada viaja descifrado: el llamador resuelve nombres con `path_enc`.
     */
    async historial(pathIdHex, before, limit = 50) {
      const params = new URLSearchParams({ path_id: pathIdHex, limit: String(limit) });
      if (before !== void 0) params.set("before", String(before));
      const respuesta = await fetch(
        `${this.base}/api/v1/vaults/${this.opciones.vault}/history?${params.toString()}`,
        { headers: this.headers() }
      );
      return this.json(respuesta);
    }
    /** Descarga un blob del CAS (el llamador verifica que los bytes hasheen al `blob_id`). */
    async getBlob(blobIdHex) {
      const respuesta = await fetch(
        `${this.base}/api/v1/vaults/${this.opciones.vault}/blobs/${blobIdHex}`,
        { headers: this.headers() }
      );
      if (!respuesta.ok) await this.lanzar(respuesta);
      return new Uint8Array(await respuesta.arrayBuffer());
    }
    /** Publica un blob (el contenido ya cifrado, con su sobre). */
    async putBlob(blobIdHex, bytes) {
      const respuesta = await fetch(
        `${this.base}/api/v1/vaults/${this.opciones.vault}/blobs/${blobIdHex}`,
        {
          method: "PUT",
          headers: { ...this.headers(), "content-type": "application/octet-stream" },
          body: new Uint8Array(bytes).buffer
        }
      );
      if (!respuesta.ok) await this.lanzar(respuesta);
    }
    /**
     * Commit por WS (ÚNICO camino). Un `conflict` no es un error de red: es el resultado
     * del CAS y se lanza como `SyncConflictError` para que el llamador rebasee.
     */
    async commit(batch) {
      if (!this.ws) throw new Error("SyncConnection: sin conexi\xF3n abierta");
      const espera = this.esperar(["batch_ack", "conflict"]);
      this.enviar(batch);
      const mensaje = await espera;
      if (mensaje.t === "conflict") throw new SyncConflictError(mensaje);
      const ack = mensaje;
      if (ack.batch_id !== batch.batch_id) {
        throw new Error(`WS: ack de otro batch (${ack.batch_id} != ${batch.batch_id})`);
      }
      return ack;
    }
    /**
     * ¿Hay una sesión viva? El socket puede haberse cerrado (se cayó la red, o el server cierra
     * el WS) mientras este objeto sigue existiendo: preguntar por el objeto no alcanza.
     */
    estaAbierta() {
      return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
    close() {
      this.ws?.close();
      this.ws = null;
    }
    // ------------------------------------------------------------------ interno
    enviar(mensaje) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error("SyncConnection: WS no est\xE1 abierto");
      }
      this.ws.send(JSON.stringify(mensaje));
    }
    esperar(tipos) {
      if (this.espera) throw new Error("SyncConnection: ya hay una espera en curso");
      return new Promise((resolver, rechazar) => {
        this.espera = { tipos, resolver, rechazar };
      });
    }
    onMensaje(evento) {
      if (typeof evento.data !== "string") return;
      let mensaje;
      try {
        mensaje = JSON.parse(evento.data);
      } catch {
        return;
      }
      const tipo = mensaje.t ?? "";
      if (tipo === "notify" || tipo === "ack") {
        this.notificaciones.push(mensaje);
        if (this.notificaciones.length > 100) this.notificaciones.shift();
        if (tipo === "notify") this.opciones.alRecibirAviso?.();
        return;
      }
      const espera = this.espera;
      if (!espera) return;
      this.espera = null;
      if (tipo === "error") {
        espera.rechazar(new SyncRejectedError(mensaje.code ?? null, mensaje.detail ?? null));
        return;
      }
      if (!espera.tipos.includes(tipo)) {
        espera.rechazar(new Error(`WS: mensaje inesperado '${tipo}'`));
        return;
      }
      espera.resolver(mensaje);
    }
    onCierre() {
      const espera = this.espera;
      this.espera = null;
      this.ws = null;
      espera?.rechazar(new Error("WS: la conexi\xF3n se cerr\xF3"));
    }
    async json(respuesta) {
      if (!respuesta.ok) await this.lanzar(respuesta);
      return await respuesta.json();
    }
    async lanzar(respuesta) {
      let code = null;
      let detail = null;
      try {
        const cuerpo = await respuesta.json();
        code = typeof cuerpo.code === "string" ? cuerpo.code : null;
        detail = typeof cuerpo.detail === "string" ? cuerpo.detail : null;
      } catch {
      }
      throw new SyncHttpError(respuesta.status, code, detail);
    }
  };

  // src/push.ts
  var CERO32 = new Uint8Array(32);
  var CERO64 = new Uint8Array(64);
  var operacionBytes = (operationId) => {
    const hex = operationId.replace(/-/g, "");
    if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
      throw new Error(`operation_id no es un UUID de 16 B: ${operationId}`);
    }
    return fromHex(hex);
  };
  async function encolarDiff(deps, head) {
    const { store: store2, port, keys } = deps;
    const entradas = await escanearVault(port, keys);
    const diff = await diffLocal(store2, entradas);
    let encoladas = 0;
    const encolar = async (entry) => {
      if (await store2.getOutbox(entry.operationId)) return;
      await store2.putOutbox(entry);
      encoladas += 1;
    };
    for (const archivo of diff.nuevos) {
      const bytes = await port.read(archivo.path);
      await encolar(
        prepareOutboxEntry({
          kind: "add",
          path: archivo.path,
          pathId: archivo.pathId,
          expectedRev: head,
          contentB64: b64Encode(bytes),
          contentHash: archivo.contentHash
        })
      );
    }
    for (const archivo of diff.modificados) {
      const bytes = await port.read(archivo.path);
      await encolar(
        prepareOutboxEntry({
          kind: "mod",
          path: archivo.path,
          pathId: archivo.pathId,
          expectedRev: head,
          contentB64: b64Encode(bytes),
          contentHash: archivo.contentHash
        })
      );
    }
    for (const borrado of diff.borrados) {
      await encolar(
        prepareOutboxEntry({
          kind: "del",
          path: borrado.path ?? "(desconocido)",
          pathId: borrado.pathId,
          expectedRev: head
        })
      );
    }
    return {
      diff: {
        nuevos: diff.nuevos.length,
        modificados: diff.modificados.length,
        borrados: diff.borrados.length,
        sinCambios: diff.sinCambios,
        yaEncolados: diff.yaEncolados
      },
      encoladas
    };
  }
  async function construirOp(deps, entry, expectedRev) {
    const { conn, keys, vaultUuid, epoch } = deps;
    const identidad = identityFromSubkeys(keys);
    const pathIdBytes = fromHex(entry.pathId);
    const esDel = entry.kind === "del";
    let blobIdHex = null;
    let blobIdBytes = CERO32;
    let tamano = 0;
    if (!esDel) {
      if (!entry.snapshot || !entry.snapshotHash) {
        throw new Error(`outbox ${entry.operationId}: sin snapshot recuperable`);
      }
      const plano = new Uint8Array(await entry.snapshot.arrayBuffer());
      const real = toHex(cryptoProvider().sha256(plano));
      if (real !== entry.snapshotHash) {
        throw new Error(
          `snapshot corrupto en ${entry.operationId} (declarado ${entry.snapshotHash}, real ${real})`
        );
      }
      const almacenado = encryptBlob(keys, plano);
      const idBytes = blobId(almacenado);
      blobIdHex = toHex(idBytes);
      blobIdBytes = idBytes;
      tamano = plano.length;
      await conn.putBlob(blobIdHex, almacenado);
    }
    const tmacBytes = esDel ? CERO64 : tMac(identidad, vaultUuid, pathIdBytes, blobIdBytes, epoch);
    const sig = signRecord(
      identidad,
      pathIdBytes,
      blobIdBytes,
      tmacBytes,
      signOpCode(entry.kind),
      tamano,
      // Un `del` no lleva mtime en el wire: el server reconstruye el mensaje con 0
      // (`op.mtime.unwrap_or(0)`) — firmar con el queuedAt delata la firma.
      esDel ? 0 : entry.queuedAt,
      expectedRev,
      operacionBytes(entry.operationId),
      epoch
    );
    const op = {
      op: entry.kind,
      path_id: b64Encode(pathIdBytes),
      path_enc: esDel ? null : b64Encode(pathEnc(keys, entry.path ?? "")),
      folder: false,
      blob_id: esDel ? null : b64Encode(blobIdBytes),
      t_mac: esDel ? null : b64Encode(tmacBytes),
      sig: b64Encode(sig),
      size: esDel ? null : tamano,
      mtime: esDel ? null : entry.queuedAt,
      ctime: null,
      prev_path_id: null
    };
    return { op, blobIdHex };
  }
  async function confirmar(deps, entry, rev, blobIdHex) {
    const { store: store2 } = deps;
    const esDel = entry.kind === "del";
    await store2.putBase({
      pathId: entry.pathId,
      rev,
      blobId: esDel ? null : blobIdHex,
      contentHash: esDel ? null : entry.snapshotHash ?? null
    });
    const indice = await store2.getIndex(entry.pathId);
    await store2.putIndex({
      pathId: entry.pathId,
      path: entry.path ?? indice?.path,
      kind: "file",
      deleted: esDel,
      rev,
      blobId: esDel ? null : blobIdHex,
      size: entry.snapshot ? entry.snapshot.size : null,
      mtime: entry.queuedAt,
      contentHash: esDel ? null : entry.snapshotHash ?? null
    });
    await store2.setOutboxState(entry.operationId, "confirmed");
    await store2.deleteOutbox(entry.operationId);
    const minRev = (await store2.readCheckpoint().catch(() => null))?.minRev ?? null;
    await store2.writeCheckpoint({ since: rev, minRev, updatedAt: Date.now() });
  }
  async function pushOnce(deps) {
    const { store: store2 } = deps;
    let head = (await store2.readCheckpoint().catch(() => null))?.since ?? 0;
    const { diff, encoladas } = await encolarDiff(deps, head);
    let empujadas = 0;
    const pendientes = (await store2.listOutbox()).filter((entry) => entry.state !== "confirmed").sort((a, b) => a.queuedAt - b.queuedAt);
    for (const entry of pendientes) {
      let blobIdHex = null;
      try {
        const construida = await construirOp(deps, entry, head);
        blobIdHex = construida.blobIdHex;
        const batch = {
          t: "batch",
          batch_id: bytesToUuid(cryptoProvider().randomBytes(16)),
          operation_id: entry.operationId,
          expected_rev: head,
          ops: [construida.op]
        };
        await store2.setOutboxState(entry.operationId, "sent");
        const ack = await deps.conn.commit(batch);
        head = ack.rev;
        await confirmar(deps, entry, ack.rev, blobIdHex);
        empujadas += 1;
      } catch (error) {
        if (error instanceof SyncConflictError) {
          await store2.setOutboxState(entry.operationId, "pending");
          return {
            diff,
            encoladas,
            empujadas,
            headRev: head,
            conflicto: {
              operationId: entry.operationId,
              path: entry.path,
              mensaje: error.message
            }
          };
        }
        throw error;
      }
    }
    return { diff, encoladas, empujadas, headRev: head };
  }

  // src/reconcile.ts
  var CERO_32 = "00".repeat(32);
  var sinBlob = (blobIdB64) => {
    try {
      return toHex(b64Decode(blobIdB64)) === CERO_32;
    } catch {
      return false;
    }
  };
  async function aplicarRegistro(deps, conn, registro) {
    const { store: store2, keys } = deps;
    const pathIdHex = toHex(b64Decode(registro.path_id));
    const deleted = registro.op === "del";
    const folder = !deleted && sinBlob(registro.blob_id);
    let path = "";
    if (!deleted && registro.path_enc) {
      path = decryptPathEnc(keys, b64Decode(registro.path_enc), fromHex(pathIdHex));
    } else if (deleted) {
      path = (await store2.getIndex(pathIdHex))?.path ?? "";
    }
    const revision = {
      pathId: pathIdHex,
      path,
      kind: folder ? "folder" : "file",
      deleted,
      rev: registro.rev,
      blobId: deleted || folder ? null : toHex(b64Decode(registro.blob_id)),
      // La delta no trae content_hash: la integridad la da el AEAD del blob (ADR-0014).
      contentHash: null
    };
    let stored = null;
    if (!deleted && !folder) {
      stored = await conn.getBlob(revision.blobId);
    }
    const resultado = await applyRevision({ ...deps, conn }, revision, stored);
    if (resultado.status === "blocked") {
      return { aplicado: false, bloqueado: { reason: resultado.reason } };
    }
    return { aplicado: true };
  }
  async function pullOnce(conn, deps) {
    const checkpoint = await deps.store.readCheckpoint().catch(() => null);
    let cursor = checkpoint?.since ?? 0;
    let applied = 0;
    for (; ; ) {
      const cambios = await conn.pull(cursor);
      if (cambios.min_rev != null && cursor < cambios.min_rev) {
        return {
          status: "resync-required",
          applied,
          headRev: cursor,
          resync: { since: cursor, minRev: cambios.min_rev }
        };
      }
      for (const registro of cambios.items) {
        const resultado = await aplicarRegistro(deps, conn, registro);
        if (resultado.bloqueado) {
          return {
            status: "blocked",
            applied,
            headRev: cursor,
            blocked: { rev: registro.rev, pathId: toHex(b64Decode(registro.path_id)), reason: resultado.bloqueado.reason }
          };
        }
        applied += 1;
      }
      const siguiente = cambios.next_since;
      if (siguiente <= cursor) break;
      cursor = siguiente;
    }
    return { status: "pulled", applied, headRev: cursor };
  }

  // src/SyncClient.ts
  async function correrCiclo(deps) {
    const { store: store2, port, keys, conn, vaultUuid, epoch } = deps;
    const pull = await pullOnce(conn, { store: store2, port, keys });
    if (pull.status === "resync-required") {
      const detalle = pull.resync ?? { since: -1, minRev: -1 };
      return {
        estado: "resync-requerido",
        pull,
        push: null,
        conflictos: [
          {
            tipo: "resync",
            mensaje: `resync requerido: since ${detalle.since} < min_rev ${detalle.minRev} (fase 4)`
          }
        ]
      };
    }
    if (pull.status === "blocked") {
      const bloqueado = pull.blocked;
      return {
        estado: "con-conflictos",
        pull,
        push: null,
        conflictos: [
          {
            tipo: "pull-bloqueado",
            pathId: bloqueado.pathId,
            rev: bloqueado.rev,
            mensaje: bloqueado.reason ?? "conflicto sin detalle"
          }
        ]
      };
    }
    const push = await pushOnce({ store: store2, port, keys, conn, vaultUuid, epoch });
    const conflictos = [];
    if (push.conflicto !== void 0) {
      conflictos.push({
        tipo: "push-conflicto",
        mensaje: push.conflicto.path ? `${push.conflicto.mensaje} (ruta: ${push.conflicto.path})` : push.conflicto.mensaje
      });
    }
    return {
      estado: conflictos.length > 0 ? "con-conflictos" : "convergido",
      pull,
      push,
      conflictos
    };
  }

  // ../../node_modules/idb/build/index.js
  var instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
  var idbProxyableTypes;
  var cursorAdvanceMethods;
  function getIdbProxyableTypes() {
    return idbProxyableTypes || (idbProxyableTypes = [
      IDBIndex,
      IDBObjectStore,
      IDBCursor,
      IDBDatabase,
      IDBTransaction
    ]);
  }
  function getCursorAdvanceMethods() {
    return cursorAdvanceMethods || (cursorAdvanceMethods = ["advance", "continue", "continuePrimaryKey"].map((method) => IDBCursor.prototype[method]));
  }
  var transactionDoneMap = /* @__PURE__ */ new WeakMap();
  var transformCache = /* @__PURE__ */ new WeakMap();
  var reverseTransformCache = /* @__PURE__ */ new WeakMap();
  function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
      const unlisten = () => {
        request.removeEventListener("success", success);
        request.removeEventListener("error", error);
      };
      const success = () => {
        resolve(wrap(request.result));
        unlisten();
      };
      const error = () => {
        reject(request.error);
        unlisten();
      };
      request.addEventListener("success", success);
      request.addEventListener("error", error);
    });
    reverseTransformCache.set(promise, request);
    return promise;
  }
  function cacheDonePromiseForTransaction(tx) {
    if (transactionDoneMap.has(tx))
      return;
    const done = new Promise((resolve, reject) => {
      const unlisten = () => {
        tx.removeEventListener("complete", complete);
        tx.removeEventListener("error", error);
        tx.removeEventListener("abort", error);
      };
      const complete = () => {
        resolve();
        unlisten();
      };
      const error = () => {
        reject(tx.error || new DOMException("AbortError", "AbortError"));
        unlisten();
      };
      tx.addEventListener("complete", complete);
      tx.addEventListener("error", error);
      tx.addEventListener("abort", error);
    });
    transactionDoneMap.set(tx, done);
  }
  var idbProxyTraps = {
    get(target, prop, receiver) {
      if (target instanceof IDBTransaction) {
        if (prop === "done")
          return transactionDoneMap.get(target);
        if (prop === "store") {
          return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
        }
      }
      return wrap(target[prop]);
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has(target, prop) {
      if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
        return true;
      }
      return prop in target;
    }
  };
  function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
  }
  function wrapFunction(func) {
    if (getCursorAdvanceMethods().includes(func)) {
      return function(...args) {
        func.apply(unwrap(this), args);
        return wrap(this.request);
      };
    }
    return function(...args) {
      return wrap(func.apply(unwrap(this), args));
    };
  }
  function transformCachableValue(value) {
    if (typeof value === "function")
      return wrapFunction(value);
    if (value instanceof IDBTransaction)
      cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
      return new Proxy(value, idbProxyTraps);
    return value;
  }
  function wrap(value) {
    if (value instanceof IDBRequest)
      return promisifyRequest(value);
    if (transformCache.has(value))
      return transformCache.get(value);
    const newValue = transformCachableValue(value);
    if (!Object.is(newValue, value)) {
      transformCache.set(value, newValue);
      reverseTransformCache.set(newValue, value);
    }
    return newValue;
  }
  var unwrap = (value) => reverseTransformCache.get(value);
  function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name, version);
    const openPromise = wrap(request);
    if (upgrade) {
      request.addEventListener("upgradeneeded", (event) => {
        upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
      });
    }
    if (blocked) {
      request.addEventListener("blocked", (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion,
        event.newVersion,
        event
      ));
    }
    openPromise.then((db) => {
      if (terminated)
        db.addEventListener("close", () => terminated());
      if (blocking) {
        db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
      }
    }).catch(() => {
    });
    return openPromise;
  }
  var readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
  var writeMethods = ["put", "add", "delete", "clear"];
  var cachedMethods = {};
  function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
      return;
    }
    if (cachedMethods[prop])
      return cachedMethods[prop];
    const targetFuncName = prop.replace(/FromIndex$/, "");
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
      // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
      !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
    ) {
      return;
    }
    const method = async function(storeName, ...args) {
      const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
      let target2 = tx.store;
      if (useIndex)
        target2 = target2.index(args.shift());
      return (await Promise.all([
        target2[targetFuncName](...args),
        isWrite && tx.done
      ]))[0];
    };
    return cachedMethods[prop] = method;
  }
  replaceTraps((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
  }));
  var advanceMethodProps = ["advance", "continue", "continuePrimaryKey"];
  var methodMap = {};
  var advanceResults = /* @__PURE__ */ new WeakMap();
  var ittrProxiedCursorToOriginalProxy = /* @__PURE__ */ new WeakMap();
  var cursorIteratorTraps = {
    get(target, prop) {
      if (!advanceMethodProps.includes(prop))
        return target[prop];
      let cachedFunc = methodMap[prop];
      if (!cachedFunc) {
        cachedFunc = methodMap[prop] = function(...args) {
          advanceResults.set(this, ittrProxiedCursorToOriginalProxy.get(this)[prop](...args));
        };
      }
      return cachedFunc;
    }
  };
  async function* iterate(...args) {
    let cursor = this;
    if (!(cursor instanceof IDBCursor)) {
      cursor = await cursor.openCursor(...args);
    }
    if (!cursor)
      return;
    cursor = cursor;
    const proxiedCursor = new Proxy(cursor, cursorIteratorTraps);
    ittrProxiedCursorToOriginalProxy.set(proxiedCursor, cursor);
    reverseTransformCache.set(proxiedCursor, unwrap(cursor));
    while (cursor) {
      yield proxiedCursor;
      cursor = await (advanceResults.get(proxiedCursor) || cursor.continue());
      advanceResults.delete(proxiedCursor);
    }
  }
  function isIteratorProp(target, prop) {
    return prop === Symbol.asyncIterator && instanceOfAny(target, [IDBIndex, IDBObjectStore, IDBCursor]) || prop === "iterate" && instanceOfAny(target, [IDBIndex, IDBObjectStore]);
  }
  replaceTraps((oldTraps) => ({
    ...oldTraps,
    get(target, prop, receiver) {
      if (isIteratorProp(target, prop))
        return iterate;
      return oldTraps.get(target, prop, receiver);
    },
    has(target, prop) {
      return isIteratorProp(target, prop) || oldTraps.has(target, prop);
    }
  }));

  // src/StateStore.ts
  var SCHEMA_VERSION = 1;
  var DB_NAME_DEFAULT = "ovaultd";
  var STORE_NAMES = [
    "index",
    "base",
    "outbox",
    "transfers",
    "intents",
    "checkpoint"
  ];
  var MIGRATIONS = [
    // v0 → v1: esquema inicial completo.
    (db) => {
      db.createObjectStore("index", { keyPath: "pathId" });
      db.createObjectStore("base", { keyPath: "pathId" });
      const outbox = db.createObjectStore("outbox", { keyPath: "operationId" });
      outbox.createIndex("by_queued", "queuedAt");
      const transfers = db.createObjectStore("transfers", { keyPath: "transferId" });
      transfers.createIndex("by_updated", "updatedAt");
      const intents = db.createObjectStore("intents", { keyPath: "intentId" });
      intents.createIndex("by_state", "state");
      db.createObjectStore("checkpoint", { keyPath: "id" });
    }
  ];
  var StateStore = class _StateStore {
    constructor(db) {
      this.db = db;
    }
    db;
    static async open(name = DB_NAME_DEFAULT) {
      const db = await openDB(name, SCHEMA_VERSION, {
        upgrade(database, oldVersion) {
          for (let version = oldVersion; version < SCHEMA_VERSION; version += 1) {
            MIGRATIONS[version]?.(database);
          }
        },
        blocked() {
          console.warn("[ovaultd] IndexedDB bloqueada por una conexi\xF3n anterior");
        }
      });
      return new _StateStore(db);
    }
    /** Cierra la conexión (los datos quedan durables en el perfil). */
    close() {
      this.db.close();
    }
    // ------------------------------------------------------------------ checkpoint
    async readCheckpoint() {
      return await this.db.get("checkpoint", "checkpoint") ?? null;
    }
    async writeCheckpoint(entry) {
      const value = { id: "checkpoint", ...entry };
      await this.db.put("checkpoint", value);
      return value;
    }
    // ------------------------------------------------------------------ index
    async getIndex(pathId2) {
      return await this.db.get("index", pathId2) ?? null;
    }
    async putIndex(entry) {
      await this.db.put("index", entry);
    }
    async deleteIndex(pathId2) {
      await this.db.delete("index", pathId2);
    }
    async listIndex() {
      return this.db.getAll("index");
    }
    // ------------------------------------------------------------------ base
    async getBase(pathId2) {
      return await this.db.get("base", pathId2) ?? null;
    }
    async putBase(entry) {
      await this.db.put("base", entry);
    }
    async deleteBase(pathId2) {
      await this.db.delete("base", pathId2);
    }
    async listBase() {
      return this.db.getAll("base");
    }
    // ------------------------------------------------------------------ outbox
    async putOutbox(entry) {
      await this.db.put("outbox", entry);
    }
    async getOutbox(operationId) {
      return await this.db.get("outbox", operationId) ?? null;
    }
    /** Outbox en orden FIFO de encolado (cola serial). */
    async listOutbox() {
      return this.db.getAllFromIndex("outbox", "by_queued");
    }
    async deleteOutbox(operationId) {
      await this.db.delete("outbox", operationId);
    }
    /** Transición de estado de una operación (pending → sent → confirmed). */
    async setOutboxState(operationId, state) {
      const entry = await this.db.get("outbox", operationId);
      if (!entry) throw new Error(`outbox: no existe la operaci\xF3n ${operationId}`);
      const updated = { ...entry, state };
      await this.db.put("outbox", updated);
      return updated;
    }
    // ------------------------------------------------------------------ transfers
    async putTransfer(entry) {
      await this.db.put("transfers", entry);
    }
    async getTransfer(transferId) {
      return await this.db.get("transfers", transferId) ?? null;
    }
    async listTransfers() {
      return this.db.getAllFromIndex("transfers", "by_updated");
    }
    async deleteTransfer(transferId) {
      await this.db.delete("transfers", transferId);
    }
    // ------------------------------------------------------------------ intents
    async putIntent(entry) {
      await this.db.put("intents", entry);
    }
    async getIntent(intentId) {
      return await this.db.get("intents", intentId) ?? null;
    }
    /** Intenciones en un estado (recuperación al reiniciar: se listan las `pending`). */
    async listIntents(state) {
      if (state === void 0) return this.db.getAll("intents");
      return this.db.getAllFromIndex("intents", "by_state", state);
    }
    async deleteIntent(intentId) {
      await this.db.delete("intents", intentId);
    }
    /** Intención → `verified` (hash/AEAD verificados, lista para publicar). */
    async markIntentVerified(intentId) {
      const intent = await this.db.get("intents", intentId);
      if (!intent) throw new Error(`apply: no existe la intenci\xF3n ${intentId}`);
      const updated = { ...intent, state: "verified" };
      await this.db.put("intents", updated);
      return updated;
    }
    /**
     * Commit ATÓMICO del journal: cierra la intención y avanza base/índice/checkpoint en
     * UNA transacción de IndexedDB. `since` avanza SOLO por acá — recibir un frame no
     * equivale a aplicarlo, y un commit a medias no existe.
     */
    async completeApply(input) {
      const intent = await this.db.get("intents", input.intentId);
      if (!intent) throw new Error(`apply: no existe la intenci\xF3n ${input.intentId}`);
      const tx = this.db.transaction(["intents", "base", "index", "checkpoint"], "readwrite");
      await tx.objectStore("intents").delete(input.intentId);
      if (input.base) await tx.objectStore("base").put(input.base);
      if (input.index) await tx.objectStore("index").put(input.index);
      if (input.checkpoint) {
        await tx.objectStore("checkpoint").put({
          id: "checkpoint",
          since: input.checkpoint.since,
          minRev: input.checkpoint.minRev,
          updatedAt: Date.now()
        });
      }
      await tx.done;
    }
  };

  // src/runtime.ts
  var RUNTIME_VERSION = "0.6.0";
  var store = null;
  var exigirStore = () => {
    if (!store) throw new Error("el StateStore no est\xE1 abierto (llam\xE1 a store.open primero)");
    return store;
  };
  var applyKeys = null;
  var exigirApply = () => {
    if (!applyKeys) throw new Error("apply: falta apply.configure (subclaves del vault)");
    return { store: exigirStore(), keys: applyKeys };
  };
  var syncConn = null;
  var syncVaultMeta = null;
  var serializarOutbox = (entry) => ({
    operationId: entry.operationId,
    kind: entry.kind,
    pathId: entry.pathId,
    path: entry.path ?? null,
    prevPathId: entry.prevPathId ?? null,
    expectedRev: entry.expectedRev,
    queuedAt: entry.queuedAt,
    state: entry.state,
    snapshotHash: entry.snapshotHash ?? null,
    snapshotSize: entry.snapshot ? entry.snapshot.size : null
  });
  var handlers = {
    "runtime.ping": () => "pong",
    "runtime.info": () => ({
      version: RUNTIME_VERSION,
      schemaVersion: SCHEMA_VERSION,
      origin: globalThis.location.origin,
      userAgent: globalThis.navigator.userAgent
    }),
    // ------------------------------------------------------------------ state store
    "store.open": async (params) => {
      const name = typeof params.name === "string" ? params.name : void 0;
      if (store) store.close();
      store = await StateStore.open(name);
      return { schemaVersion: SCHEMA_VERSION, stores: [...STORE_NAMES] };
    },
    "store.close": () => {
      exigirStore().close();
      store = null;
      return { closed: true };
    },
    "store.checkpoint.read": async () => exigirStore().readCheckpoint(),
    "store.checkpoint.write": async (params) => {
      const since = Number(params.since);
      if (!Number.isFinite(since) || since < 0) throw new Error(`since inv\xE1lido: ${String(params.since)}`);
      const minRev = params.minRev === null || params.minRev === void 0 ? null : Number(params.minRev);
      return exigirStore().writeCheckpoint({ since, minRev, updatedAt: Date.now() });
    },
    "store.base.get": (params) => exigirStore().getBase(String(params.pathId)),
    "store.index.get": (params) => exigirStore().getIndex(String(params.pathId)),
    // ------------------------------------------------------------------ outbox
    "outbox.enqueue": async (params) => {
      const request = params.request;
      if (!request || typeof request !== "object") throw new Error("outbox.enqueue: falta request");
      const entry = prepareOutboxEntry(request);
      const existente = await exigirStore().getOutbox(entry.operationId);
      if (existente) return { created: false, entry: serializarOutbox(existente) };
      await exigirStore().putOutbox(entry);
      return { created: true, entry: serializarOutbox(entry) };
    },
    "outbox.get": async (params) => {
      const entry = await exigirStore().getOutbox(String(params.operationId));
      return entry ? serializarOutbox(entry) : null;
    },
    /** Devuelve el snapshot recuperable en base64 (verificación byte a byte). */
    "outbox.snapshot": async (params) => {
      const entry = await exigirStore().getOutbox(String(params.operationId));
      if (!entry || !entry.snapshot) return null;
      const bytes = new Uint8Array(await entry.snapshot.arrayBuffer());
      return { b64: b64Encode(bytes), hash: entry.snapshotHash ?? null, size: bytes.length };
    },
    "outbox.list": async () => (await exigirStore().listOutbox()).map(serializarOutbox),
    "outbox.markSent": async (params) => serializarOutbox(await exigirStore().setOutboxState(String(params.operationId), "sent")),
    "outbox.confirm": async (params) => serializarOutbox(await exigirStore().setOutboxState(String(params.operationId), "confirmed")),
    "outbox.remove": async (params) => {
      await exigirStore().deleteOutbox(String(params.operationId));
      return { ok: true };
    },
    // Compatibilidad de bajo nivel (el spec del corte 1 la usa): entrada cruda, sin Blob.
    "store.outbox.put": async (params) => {
      const entry = params.entry;
      if (!entry || typeof entry.operationId !== "string") throw new Error("outbox.put: falta operationId");
      await exigirStore().putOutbox(entry);
      return { ok: true };
    },
    "store.outbox.delete": async (params) => {
      await exigirStore().deleteOutbox(String(params.operationId));
      return { ok: true };
    },
    // ------------------------------------------------------------------ journal de aplicación
    "apply.begin": async (params) => {
      const candidate = params.candidate;
      if (!candidate || typeof candidate !== "object") throw new Error("apply.begin: falta candidate");
      const intent = createIntent(candidate);
      const existente = await exigirStore().getIntent(intent.intentId);
      if (existente) return { created: false, intent: existente };
      await exigirStore().putIntent(intent);
      return { created: true, intent };
    },
    "apply.verify": async (params) => {
      const intentId = String(params.intentId);
      const intent = await exigirStore().getIntent(intentId);
      if (!intent) throw new Error(`apply: no existe la intenci\xF3n ${intentId}`);
      const tempName = typeof params.tempName === "string" ? params.tempName : intent.tempName;
      const updated = { ...intent, tempName, state: "verified" };
      await exigirStore().putIntent(updated);
      return updated;
    },
    "apply.pending": () => exigirStore().listIntents(),
    "apply.abort": async (params) => {
      await exigirStore().deleteIntent(String(params.intentId));
      return { ok: true };
    },
    "apply.complete": async (params) => {
      const input = params.input;
      if (!input || typeof input.intentId !== "string") throw new Error("apply.complete: falta input.intentId");
      await exigirStore().completeApply(input);
      return { ok: true };
    },
    // ------------------------------------------------------------------ apply (orquestación real)
    "apply.configure": (params) => {
      const raw = params.keys;
      const subclaves = ["content", "nonce", "path", "meta", "bind", "sign"];
      const keys = {};
      for (const nombre of subclaves) {
        const valor = raw?.[nombre];
        if (typeof valor !== "string" || !/^[0-9a-fA-F]{64}$/.test(valor)) {
          throw new Error(`apply.configure: falta la subclave ${nombre} (hex de 32 B)`);
        }
        keys[nombre] = fromHex(valor);
      }
      applyKeys = keys;
      return { configured: true, subclaves: subclaves.length };
    },
    "apply.run": async (params) => {
      const { store: store2, keys } = exigirApply();
      const revision = params.revision;
      if (!revision || typeof revision !== "object") throw new Error("apply.run: falta revision");
      const stored = typeof params.storedB64 === "string" ? b64Decode(params.storedB64) : null;
      return applyRevision(
        { store: store2, port: new HttpFileSystemPort(globalThis.location.origin), keys },
        revision,
        stored
      );
    },
    "apply.recover": async () => {
      const { store: store2, keys } = exigirApply();
      return recoverApplies({
        store: store2,
        port: new HttpFileSystemPort(globalThis.location.origin),
        keys
      });
    },
    // ------------------------------------------------------------------ sync (corte 4)
    "sync.open": async (params) => {
      const { keys } = exigirApply();
      if (syncConn) {
        syncConn.close();
        syncConn = null;
      }
      const vaultUuid = typeof params.vaultUuid === "string" ? b64Decode(params.vaultUuid) : null;
      if (!vaultUuid || vaultUuid.length !== 16) {
        throw new Error("sync.open: falta vaultUuid (16 B en base64, el del material del vault)");
      }
      const conn = new SyncConnection({
        baseUrl: String(params.baseUrl),
        token: String(params.token),
        vault: Number(params.vault),
        device: Number(params.device),
        keys
      });
      const { headRev } = await conn.open({ since: Number(params.since ?? 0) });
      syncConn = conn;
      syncVaultMeta = { vaultUuid, epoch: Number(params.epoch ?? 1) };
      return { headRev };
    },
    "sync.pullOnce": async () => {
      if (!syncConn) throw new Error("sync: no hay conexi\xF3n abierta (sync.open primero)");
      const { store: store2, keys } = exigirApply();
      return pullOnce(syncConn, {
        store: store2,
        port: new HttpFileSystemPort(globalThis.location.origin),
        keys
      });
    },
    /** Escaneo + hash-diff sin tocar la red (lo que muestra `list-local`). */
    "sync.scan": async () => {
      const { store: store2, keys } = exigirApply();
      const port = new HttpFileSystemPort(globalThis.location.origin);
      const entradas = await escanearVault(port, keys);
      const diff = await diffLocal(store2, entradas);
      return {
        diff,
        entradas: entradas.map((entrada) => ({
          path: entrada.path,
          pathId: entrada.pathId,
          size: entrada.size,
          contentHash: entrada.contentHash
        }))
      };
    },
    "sync.pushOnce": async () => {
      if (!syncConn || !syncVaultMeta) {
        throw new Error("sync: no hay conexi\xF3n abierta (sync.open primero)");
      }
      const { store: store2, keys } = exigirApply();
      return pushOnce({
        store: store2,
        port: new HttpFileSystemPort(globalThis.location.origin),
        keys,
        conn: syncConn,
        vaultUuid: syncVaultMeta.vaultUuid,
        epoch: syncVaultMeta.epoch
      });
    },
    // -------------------------------------------------------------- history (corte 5b)
    /**
     * Historia de un archivo (LECTURA pura): usa la conexión abierta SOLO para leer.
     * No toca el estado de sync ni el vault.
     */
    "history.list": async (params) => {
      if (!syncConn) throw new Error("history: no hay conexi\xF3n abierta (sync.open primero)");
      const { keys } = exigirApply();
      const ruta = typeof params.ruta === "string" ? params.ruta : "";
      if (!ruta) throw new Error("history.list: falta ruta");
      return historiaDeArchivo({
        conn: syncConn,
        keys,
        ruta,
        before: params.before === void 0 || params.before === null ? void 0 : Number(params.before),
        limit: params.limit === void 0 ? void 0 : Number(params.limit)
      });
    },
    /** Contenido descifrado de una revisión (verifica el hash del blob antes de descifrar). */
    "history.preview": async (params) => {
      if (!syncConn) throw new Error("history: no hay conexi\xF3n abierta (sync.open primero)");
      const { keys } = exigirApply();
      const blobId2 = typeof params.blobId === "string" ? params.blobId : "";
      if (!blobId2) throw new Error("history.preview: falta blobId");
      const contenido = await contenidoDeRevision({ conn: syncConn, keys, blobId: blobId2 });
      let texto;
      try {
        texto = new TextDecoder("utf-8", { fatal: true }).decode(contenido);
      } catch {
        throw new Error(`la revisi\xF3n no es texto UTF-8 (${contenido.length} bytes binarios)`);
      }
      return { texto, bytes: contenido.length };
    },
    /** Diff legible por líneas entre dos textos (lo usa el preview del CLI). */
    "history.diff": (params) => {
      const anterior = typeof params.anterior === "string" ? params.anterior : "";
      const nuevo = typeof params.nuevo === "string" ? params.nuevo : "";
      return { diff: diffDeTextos(anterior, nuevo) };
    },
    "sync.close": () => {
      syncConn?.close();
      syncConn = null;
      syncVaultMeta = null;
      return { closed: true };
    },
    /**
     * Ciclo completo (SyncClient): pull → push con la tabla de decisión. Pull bloqueado
     * o resync ⇒ NO se pushea (el checkpoint quedaría atrás de una revisión sin aplicar).
     */
    "sync.cycle": async () => {
      if (!syncConn || !syncVaultMeta) {
        throw new Error("sync: no hay conexi\xF3n abierta (sync.open primero)");
      }
      const { store: store2, keys } = exigirApply();
      return correrCiclo({
        store: store2,
        port: new HttpFileSystemPort(globalThis.location.origin),
        keys,
        conn: syncConn,
        vaultUuid: syncVaultMeta.vaultUuid,
        epoch: syncVaultMeta.epoch
      });
    }
  };
  var dispatch = async (request) => {
    try {
      const handler = handlers[request.method];
      if (!handler) throw new Error(`m\xE9todo desconocido: ${request.method}`);
      const result = await handler(request.params ?? {});
      return { id: request.id, ok: true, result };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { id: request.id, ok: false, error: { message: err.message, name: err.name } };
    }
  };
  globalThis.ovaultdRuntime = {
    dispatch,
    version: RUNTIME_VERSION
  };
})();
/*! Bundled license information:

@noble/ciphers/utils.js:
  (*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) *)

@noble/curves/utils.js:
@noble/curves/abstract/modular.js:
@noble/curves/abstract/curve.js:
@noble/curves/abstract/edwards.js:
@noble/curves/ed25519.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
