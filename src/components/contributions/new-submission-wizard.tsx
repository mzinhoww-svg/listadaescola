"use client";

import * as React from "react";
import { useActionState } from "react";
import { ChevronLeft } from "lucide-react";

import { startSubmissionAction, type SchoolSearchOption, type StartSubmissionState } from "@/lib/contributions/actions";
import { EDUCATION_LEVELS, SCHOOL_YEAR_OPTIONS } from "@/lib/contributions/constants";
import { SchoolPicker } from "@/components/contributions/school-picker";
import { AnonymousItemsStep, type AnonymousDraftMeta } from "@/components/contributions/anonymous-items-step";
import { WizardSteps } from "@/components/contributions/wizard-steps";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";

const initialState: StartSubmissionState = {};
const MAX_SERIES_NAME_LENGTH = 200;

export interface NewSubmissionWizardProps {
  /** Home CTA (sub-projeto papelaria #1): escola + série/ano + itens ficam
   * em localStorage até autenticar, em vez de criar a submissão no banco
   * de cara. Fluxo padrão (a partir de /enviar-lista, já logado) nunca
   * passa por aqui -- continua batendo direto em startSubmissionAction. */
  allowAnonymous?: boolean;
  isAuthenticated?: boolean;
}

export function NewSubmissionWizard({ allowAnonymous = false, isAuthenticated = false }: NewSubmissionWizardProps) {
  const [school, setSchool] = React.useState<SchoolSearchOption | null>(null);
  const [draftMeta, setDraftMeta] = React.useState<AnonymousDraftMeta | null>(null);
  const [anonymousError, setAnonymousError] = React.useState<string | null>(null);
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

  if (allowAnonymous && draftMeta) {
    return (
      <AnonymousItemsStep
        school={school}
        draftMeta={draftMeta}
        isAuthenticated={isAuthenticated}
        onBack={() => setDraftMeta(null)}
      />
    );
  }

  function handleAnonymousSeriesSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnonymousError(null);
    const formData = new FormData(event.currentTarget);
    const educationLevel = String(formData.get("education_level") ?? "");
    const seriesName = String(formData.get("series_name") ?? "").trim();
    const schoolYear = Number(formData.get("school_year"));

    if (!(EDUCATION_LEVELS as readonly string[]).includes(educationLevel)) {
      setAnonymousError("Selecione uma etapa de ensino válida.");
      return;
    }
    if (!seriesName || seriesName.length > MAX_SERIES_NAME_LENGTH) {
      setAnonymousError("Informe a série/ano escolar (ex.: 5º Ano).");
      return;
    }
    if (!(SCHOOL_YEAR_OPTIONS as readonly number[]).includes(schoolYear)) {
      setAnonymousError("Selecione um ano letivo válido.");
      return;
    }
    setDraftMeta({ educationLevel, seriesName, schoolYear });
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
            <form
              action={allowAnonymous ? undefined : formAction}
              onSubmit={allowAnonymous ? handleAnonymousSeriesSubmit : undefined}
              className="flex flex-col gap-4"
            >
              {!allowAnonymous && <input type="hidden" name="school_id" value={school.id} />}
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
              {(allowAnonymous ? anonymousError : state?.error) && (
                <p role="alert" className="text-sm text-danger-600">
                  {allowAnonymous ? anonymousError : state?.error}
                </p>
              )}
              <div className="flex justify-end">
                {allowAnonymous ? <Button type="submit">Continuar</Button> : <SubmitButton>Continuar</SubmitButton>}
              </div>
            </form>
          </CardContent>
        </Card>
      </>
  );
}
