import { Alert } from '../ui';

const AuthAlert = ({ error, success }) => {
  if (!error && !success) return null;

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
    </>
  );
};

export default AuthAlert;

