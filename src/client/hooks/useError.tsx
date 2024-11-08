import { useCallback, useState } from "react";

function isErrorLike(error: unknown): error is {
  message: string;
} {
  return typeof (error as any)?.message === "string";
}

export const useError = (): [string | undefined, (err: unknown) => void] => {
  const [error, setError] = useState<string>();

  const safeSetError = useCallback((error: unknown) => {
    if (isErrorLike(error)) {
      setError(error.message);
    } else {
      setError(`An unknown error occurred: ${JSON.stringify(error, null, 4)}`);
    }
  }, []);

  return [error, safeSetError];
};
