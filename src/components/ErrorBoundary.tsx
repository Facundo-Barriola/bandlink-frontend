"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-semibold mb-2">Error en el componente</h3>
          <p className="text-red-700 text-sm mb-3">
            {this.state.error?.message || "Se produjo un error inesperado"}
          </p>
          <Button 
            onClick={() => this.setState({ hasError: false, error: undefined })}
            variant="outline"
            size="sm"
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            Reintentar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}


