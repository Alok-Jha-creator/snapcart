import TrackOrder from '@/components/TrackOrder'

export default async function TrackPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <TrackOrder orderId={orderId} />
}
