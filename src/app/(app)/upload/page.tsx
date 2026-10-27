import { getDb } from '@/db/client';
import { listUploads } from '@/db/reports';
import { Dropzone } from '@/components/Dropzone';
import { PastUploads } from '@/components/PastUploads';

export const metadata = { title: 'Загрузка' };
export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  const uploads = await listUploads(getDb());
  return (
    <>
      <div className="text-xs text-white/60">Шаг 1</div>
      <h1 className="mb-3 text-[22px] font-bold">Загрузить выписки</h1>
      <Dropzone />
      <PastUploads uploads={uploads} />
    </>
  );
}
