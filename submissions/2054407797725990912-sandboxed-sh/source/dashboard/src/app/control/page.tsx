import { Suspense } from 'react';
import ControlClient from './control-client';

export default function ControlPage() {
  // No visible Suspense fallback: AuthGate's full-screen ring covers the cold
  // load, and ControlClient renders its own skeleton inside the chat area
  // while mission data fetches. A centered icon here only flashes for a few
  // hundred ms between the two and reads as an extra unrelated spinner.
  return (
    <Suspense fallback={null}>
      <ControlClient />
    </Suspense>
  );
}
