import type { ToolPlugin } from './tool-plugin';
import { base64FilePlugin, base64TextPlugin } from '../tools/base64/base64-plugin';
import { unicodePlugin, urlPlugin } from '../tools/codec/codec-plugin';
import { aesGcmPlugin, digestPlugin, hmacPlugin } from '../tools/crypto/crypto-plugin';
import { randomPlugin, uuidPlugin } from '../tools/generator/generator-plugin';
import { imageCompressPlugin } from '../tools/image/image-plugin';
import { jsonPlugin } from '../tools/json/json-plugin';
import { sqlPlugin } from '../tools/sql/sql-plugin';
import { timestampPlugin } from '../tools/timestamp/timestamp-plugin';

export const plugins: ToolPlugin[] = [
  jsonPlugin,
  urlPlugin,
  unicodePlugin,
  base64TextPlugin,
  base64FilePlugin,
  digestPlugin,
  hmacPlugin,
  aesGcmPlugin,
  uuidPlugin,
  randomPlugin,
  timestampPlugin,
  imageCompressPlugin,
  sqlPlugin,
];
