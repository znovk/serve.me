import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-lg border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg]:size-4 [&>svg~*]:pl-7", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground",
      destructive: "border-destructive/40 bg-destructive/5 text-destructive",
      success: "border-success/40 bg-success/5 text-success",
      placeholder: "border-dashed bg-muted/50 text-muted-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="status" className={cn(alertVariants({ variant }), className)} {...props} />;
}
function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("mb-1 font-medium leading-none", className)} {...props} />;
}
function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm opacity-90", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription };
