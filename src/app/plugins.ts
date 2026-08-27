import type { ToolPlugin } from './tool-plugin';
import { base64FilePlugin, base64TextPlugin } from '../tools/base64/base64-plugin';
import { unicodePlugin, urlPlugin } from '../tools/codec/codec-plugin';
import { colorPlugin } from '../tools/color/color-plugin';
import { aesGcmPlugin, digestPlugin, hmacPlugin } from '../tools/crypto/crypto-plugin';
import { cutoutPlugin } from '../tools/cutout/cutout-plugin';
import { randomPlugin, uuidPlugin } from '../tools/generator/generator-plugin';
import { imageCompressPlugin } from '../tools/image/image-plugin';
import { jsonPlugin } from '../tools/json/json-plugin';
import { jwtPlugin } from '../tools/jwt/jwt-plugin';
import { ocrPlugin } from '../tools/ocr/ocr-plugin';
import { sqlPlugin } from '../tools/sql/sql-plugin';
import { casePlugin } from '../tools/text/text-plugin';
import { timestampPlugin } from '../tools/timestamp/timestamp-plugin';

export const plugins: ToolPlugin[] = [
  jsonPlugin,
  urlPlugin,
  unicodePlugin,
  jwtPlugin,
  base64TextPlugin,
  base64FilePlugin,
  digestPlugin,
  hmacPlugin,
  aesGcmPlugin,
  uuidPlugin,
  randomPlugin,
  casePlugin,
  timestampPlugin,
  imageCompressPlugin,
  cutoutPlugin,
  colorPlugin,
  ocrPlugin,
  sqlPlugin,
];
