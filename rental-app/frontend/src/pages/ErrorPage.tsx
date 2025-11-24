import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { AnimatedButton } from '../components/AnimatedButton';

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Something went wrong';
  let description = 'An unexpected error occurred.';
  let statusCode: number | undefined;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    if (error.status === 404) {
      title = 'Page not found';
      description = 'The page you are looking for does not exist or has moved.';
    } else if (error.status === 403) {
      title = 'Access denied';
      description = 'You do not have permission to view this page.';
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center px-6 text-center space-y-6">
      <p className="text-sm uppercase tracking-[0.4em] text-muted">Rental Suite</p>
      {statusCode && <p className="text-xs text-muted uppercase tracking-[0.3em]">{statusCode}</p>}
      <h1 className="text-4xl font-display tracking-tight">{title}</h1>
      <p className="max-w-md text-sm text-muted">{description}</p>
      <AnimatedButton onClick={() => navigate('/', { replace: true })}>Go home</AnimatedButton>
    </div>
  );
}
