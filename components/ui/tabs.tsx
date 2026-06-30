"use client";

import * as React from "react";
import { cn } from "@/services/utils";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className
}: {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const selected = value ?? internalValue;

  return (
    <TabsContext.Provider
      value={{
        value: selected,
        setValue: (next) => {
          setInternalValue(next);
          onValueChange?.(next);
        }
      }}
    >
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex h-10 items-center rounded-md bg-muted p-1", className)} {...props} />;
}

export function TabsTrigger({
  value,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = useTabsContext();
  const selected = context.value === value;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={() => context.setValue(value)}
      {...props}
    />
  );
}

export function TabsContent({
  value,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = useTabsContext();
  if (context.value !== value) {
    return null;
  }

  return <div className={cn("mt-4", className)} {...props} />;
}

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be rendered inside Tabs.");
  }

  return context;
}
