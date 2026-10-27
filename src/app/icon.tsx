import { ImageResponse } from 'next/og';
import { renderIcon } from '@/lib/icon';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(renderIcon(512), size);
}
