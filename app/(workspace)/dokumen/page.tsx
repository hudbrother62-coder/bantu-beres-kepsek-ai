import { DocumentLibrary } from '@/components/document-library';
import { getAllDocumentGroups } from '@/lib/data';

export const metadata = { title: 'Pustaka Dokumen' };

export default async function DocumentsPage() {
  const { groups } = await getAllDocumentGroups();
  return <DocumentLibrary groups={groups} />;
}
