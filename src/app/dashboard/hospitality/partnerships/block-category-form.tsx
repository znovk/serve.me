"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/select";
import { blockCategory } from "@/modules/partnerships/actions";
import { initialActionState } from "@/modules/shared/action-state";

export function BlockCategoryForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState(blockCategory, initialActionState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <Field id="categoryId" label="Block an entire category">
        <NativeSelect name="categoryId" defaultValue="">
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <SubmitButton variant="outline">Block category</SubmitButton>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
