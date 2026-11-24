import {useEffect, useRef, useState} from 'react';
import type {ChangeEvent, DragEvent} from 'react';
import {useOutletContext} from "react-router";
import {CheckCircle2, ImageIcon, UploadIcon} from "lucide-react";
import {PROGRESS_INTERVAL_MS, PROGRESS_STEP, REDIRECT_DELAY_MS} from "../lib/constants";

const Upload = ({onComplete}: {onComplete?: (data: string) => Promise<boolean | void> | boolean | void}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const readerRef = useRef<FileReader | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  const {authState} = useOutletContext<{ authState: AuthState }>();
  const {isSignedIn} = authState;

  useEffect(() => {
    if (!isSignedIn) {
      setFile(null);
      setProgress(0);
      setIsDragging(false);
      setError(null);
    }

    return () => {
      attemptRef.current += 1;
      readerRef.current?.abort();
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
      readerRef.current = null;
      intervalRef.current = null;
      timeoutRef.current = null;
    };
  }, [isSignedIn]);

  const processFile = (selectedFile: File) => {
    if (!isSignedIn) return;
    if (!selectedFile.type.startsWith('image/')) return;
    if (selectedFile.size > 10 * 1024 * 1024) return;
    const attempt = ++attemptRef.current;
    readerRef.current?.abort();
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;

    setFile(selectedFile);
    setProgress(0);
    setError(null);
    const reader = new FileReader();
    readerRef.current = reader;
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setFile(null);
        return;
      }
      const data = reader.result;
      let currentProgress = 0;
      intervalRef.current = setInterval(() => {
        currentProgress = Math.min(currentProgress + PROGRESS_STEP, 100);
        setProgress(currentProgress);
        if (currentProgress === 100) {
          if (intervalRef.current !== null) clearInterval(intervalRef.current);
          intervalRef.current = null;
          if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(async () => {
            timeoutRef.current = null;
            try {
              if (await onComplete?.(data) !== false) return;
            } catch (error) {
              console.error('Failed to complete upload', error);
            }
            if (attempt === attemptRef.current) {
              setFile(null);
              setProgress(0);
              setError('Upload failed. Please try again.');
            }
          }, REDIRECT_DELAY_MS);
        }
      }, PROGRESS_INTERVAL_MS);
    };
    reader.onerror = () => setFile(null);
    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isSignedIn) setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isSignedIn && event.dataTransfer.files[0]) processFile(event.dataTransfer.files[0]);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isSignedIn && event.target.files?.[0]) processFile(event.target.files[0]);
    event.target.value = '';
  };

    return (
        <div className="upload">
            {error && <p role="alert">{error}</p>}
            {!file ? (
                <div className={`dropzone ${isDragging ? 'is-dragging' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                    <input type="file" className="drop-input" accept="image/*" disabled={!isSignedIn} onChange={handleChange} />

                    <div className="drop-content">
                        <div className="drop-icon">
                            <UploadIcon size={20} />
                        </div>
                        <p>
                            {isSignedIn ? (
                                "Click to upload or just drag and drop"
                            ) : (
                                "Sign in to upload"
                            )}
                        </p>
                        <p className="help">Maximum file 10 MB.</p>
                    </div>
                </div>

            ) : (
                    <div className="upload-status">
                        <div className="status-content">
                            <div className="status-icon">
                                {progress === 100 ? (
                                    <CheckCircle2 className="check" />
                                ) : (
                                    <ImageIcon className="image" />
                                )}
                            </div>
                            <h3>{file.name}</h3>
                            <div className="progress">
                                <div className="bar" style={{width: `${progress}%` }} />
                                <p className="status-text">
                                    {progress < 100 ? "Analyzing Floor Plan" : `Redirecting...`}
                                </p>
                            </div>
                        </div>
                    </div>
                    ) }
        </div>
    )
}

export default Upload;