import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 p-4 sm:p-5", className)}
      {...props}
    />
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Real heading level for this title. Defaults to h3 (a Card is usually a
   * subsection), but a page that uses a Card as its main/only content block
   * needs h1 or h2 here to keep the document's heading hierarchy unbroken. */
  as?: "h1" | "h2" | "h3" | "h4";
}

function CardTitle({ className, as: Heading = "h3", ...props }: CardTitleProps) {
  return (
    <Heading
      className={cn(
        "font-semibold text-neutral-900",
        // A Card used as a page's only/main content block (as="h1") needs a
        // heading weight that actually reads as the page title -- the h3
        // default (16px) was designed for a card as a subsection, and left
        // every as="h1" page (all 5 auth screens, sugerir-escola) with the
        // least confident text on the page.
        Heading === "h1" ? "text-xl sm:text-2xl" : "text-base",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-neutral-600", className)} {...props} />;
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-0 sm:p-5 sm:pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-neutral-200 p-4 sm:p-5",
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
