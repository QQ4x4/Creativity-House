import { MessagesInboxScreen } from '@/components/admin/MessagesInboxScreen';

type PageProps = {
  params: Promise<{ lang: string }>;
};

export const metadata = {
  title: 'Messages — Admin',
  robots: { index: false, follow: false },
};

export default async function AdminMessagesPage({ params }: PageProps) {
  await params;

  return <MessagesInboxScreen />;
}
