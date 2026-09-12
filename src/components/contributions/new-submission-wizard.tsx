"use client";

import * as React from "react";
import { useActionState } from "react";
import { ChevronLeft } from "lucide-react";

import { startSubmissionAction, type SchoolSearchOption, type StartSubmissionState } from "@/lib/contributions/actions";
import { EDUCATION_LEVELS, SCHOOL_YEAR_OPTIONS } from "@/lib/contributions/constants";
import { SchoolPicker } from "@/components/contributions/school-picker";
import { WizardSteps } from "@/components/contributions/wizard-steps";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: StartSubmissionState = {};

export function NewSubmissionWizard() {
  const [school, setSchool] = React.useState<SchoolSearchOption | null>(null);
  const [state, formAction] = useActionState(startSubmissionAction, initialState);

  if (!school) {
    return (
      <>
        <WizardSteps current="escola" />
        <Card>
          <CardHeader>
            <CardTitle>Qual escola?</CardTitle>
          </CardHeader>
          <CardContent>
            <SchoolPicker onSelect={setSchool} />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <WizardSteps current="serie" />
      <Card>
        <CardHeader>
          <button
            type="button"
            onClick={() => setSchool(null)}
            className="flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Trocar escola
          </button>
          <CardTitle>{school.name}</CardTitle>
          <CardDescription>{school.municipality}</CardDescription>
        </CardHeader>
          <CardContent>
            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="school_id" value={school.id} />
              <Select label="Etapa de ensino" name="education_level" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </Select>
              <Input label="Série/ano escolar" name="series_name" placeholder="Ex.: 5º Ano" required />
              <Select label="Ano letivo" name="school_year" required defaultValue={SCHOOL_YEAR_OPTIONS[0]}>
                {SCHOOL_YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
              {state?.error && (
                <p role="alert" className="text-sm text-danger-600">
                  {state.error}
                </p>
              )}
              <div className="flex justify-end">
                <SubmitButton>Continuar</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </>
  );
}
