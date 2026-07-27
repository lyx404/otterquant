import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--oq-toast-success-bg, var(--popover))",
          "--success-text": "var(--oq-toast-success-text, var(--popover-foreground))",
          "--success-border": "var(--oq-toast-success-border, var(--border))",
          "--error-bg": "var(--oq-toast-error-bg, var(--popover))",
          "--error-text": "var(--oq-toast-error-text, var(--popover-foreground))",
          "--error-border": "var(--oq-toast-error-border, var(--border))",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
