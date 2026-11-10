import { TestimonialsScreen } from '@/components/admin/testimonials/TestimonialsScreen';

type PageProps = {
  params: Promise<{ lang: string }>;
};

export const metadata = {
  title: 'Testimonials — Admin',
  robots: { index: false, follow: false },
};

export default async function AdminTestimonialsPage({ params }: PageProps) {
  await params;

  return <TestimonialsScreen />;
}
