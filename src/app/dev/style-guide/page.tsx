"use client";

import * as React from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalTrigger, ModalContent } from "@/components/ui/modal";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { BottomSheet, BottomSheetTrigger, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, Skeleton } from "@/components/ui/loading-state";
import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { useToast } from "@/components/ui/use-toast";

const colorTokens = [
  "primary",
  "neutral",
  "success",
  "warning",
  "danger",
  "info",
  "sponsored",
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 border-b border-neutral-200 pb-2 text-lg font-semibold text-neutral-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function StyleGuidePage() {
  const { toast } = useToast();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-neutral-900">Style guide</h1>
      <p className="mb-10 text-sm text-neutral-500">
        Vitrine interna dos componentes de <code className="font-mono">src/components/ui</code>.
        Rota não indexada, não faz parte do produto. Paleta é provisória — ver aviso em globals.css.
      </p>

      <Section title="Cores">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {colorTokens.map((token) => (
            <div key={token} className="flex flex-col gap-1">
              <div className="flex h-12 overflow-hidden rounded-lg border border-neutral-200">
                {[300, 500, 600, 700].map((shade) => (
                  <div key={shade} className="flex-1" style={{ background: `var(--color-${token}-${shade})` }} />
                ))}
              </div>
              <span className="text-xs font-medium text-neutral-600">{token}</span>
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <div className="h-12 rounded-lg border border-neutral-200" style={{ background: "var(--color-whatsapp)" }} />
            <span className="text-xs font-medium text-neutral-600">whatsapp (uso exclusivo)</span>
          </div>
        </div>
      </Section>

      <Section title="Tipografia">
        <div className="flex flex-col gap-2">
          <p className="text-4xl font-semibold text-neutral-900">Título 4xl / semibold</p>
          <p className="text-2xl font-semibold text-neutral-900">Título 2xl / semibold</p>
          <p className="text-lg font-semibold text-neutral-900">Título lg / semibold</p>
          <p className="text-base text-neutral-900">Corpo base / regular</p>
          <p className="text-sm text-neutral-600">Corpo sm / regular (texto secundário)</p>
          <p className="text-xs text-neutral-500">Caption xs</p>
        </div>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" loading>
            Carregando
          </Button>
          <Button variant="primary" disabled>
            Desabilitado
          </Button>
          <Button variant="outline" size="icon" aria-label="Enviar e-mail">
            <Mail className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </Section>

      <Section title="Input">
        <div className="grid max-w-md gap-4">
          <Input label="Nome" placeholder="Seu nome" />
          <Input label="E-mail" type="email" helperText="Usamos só para contato sobre sua conta." />
          <Input label="CEP" errorText="CEP inválido." defaultValue="00000000" />
        </div>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>EMEB Exemplo</CardTitle>
            <CardDescription>Cuiabá, MT · Ensino Fundamental</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="sponsored">Patrocinada</Badge>
          </CardContent>
          <CardFooter>
            <Button size="sm">Ver escola</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">Rascunho</Badge>
          <Badge variant="info">Em análise</Badge>
          <Badge variant="success">Aprovada</Badge>
          <Badge variant="danger">Rejeitada</Badge>
          <Badge variant="warning">Precisa correção</Badge>
          <Badge variant="sponsored">Patrocinada</Badge>
        </div>
      </Section>

      <Section title="Modal, Drawer e BottomSheet">
        <div className="flex flex-wrap gap-3">
          <Modal>
            <ModalTrigger asChild>
              <Button variant="outline">Abrir Modal</Button>
            </ModalTrigger>
            <ModalContent title="Confirmar ação" description="Esta é a base usada por diálogos de confirmação.">
              <Button className="w-full">Confirmar</Button>
            </ModalContent>
          </Modal>

          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">Abrir Drawer</Button>
            </DrawerTrigger>
            <DrawerContent title="Papelarias próximas" description="Uso típico: desktop (ver Prompt 09).">
              <p className="text-sm text-neutral-600">Conteúdo de exemplo do drawer.</p>
            </DrawerContent>
          </Drawer>

          <BottomSheet>
            <BottomSheetTrigger asChild>
              <Button variant="outline">Abrir BottomSheet</Button>
            </BottomSheetTrigger>
            <BottomSheetContent title="Papelarias próximas" description="Uso típico: mobile (ver Prompt 09).">
              <p className="text-sm text-neutral-600">Conteúdo de exemplo do bottom sheet.</p>
            </BottomSheetContent>
          </BottomSheet>
        </div>
      </Section>

      <Section title="Toast">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => toast({ title: "Lista salva", description: "Você pode encontrá-la em Minhas listas." })}
          >
            Toast padrão
          </Button>
          <Button
            variant="outline"
            onClick={() => toast({ title: "Enviado para moderação", variant: "success" })}
          >
            Toast success
          </Button>
          <Button
            variant="outline"
            onClick={() => toast({ title: "Não foi possível enviar", description: "Tente novamente.", variant: "danger" })}
          >
            Toast danger
          </Button>
        </div>
      </Section>

      <Section title="Table">
        <Table>
          <TableCaption>Exemplo — escolas por status</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Escola</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>EMEB Exemplo</TableCell>
              <TableCell>Cuiabá</TableCell>
              <TableCell>
                <Badge variant="success">Ativa</Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Escola Modelo</TableCell>
              <TableCell>Várzea Grande</TableCell>
              <TableCell>
                <Badge variant="neutral">Inativa</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          title="Nenhuma escola encontrada"
          description="Tente ajustar a busca ou o raio de distância."
          action={<Button size="sm">Limpar filtros</Button>}
        />
      </Section>

      <Section title="LoadingState">
        <LoadingState />
        <div className="mt-4 flex flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Section>

      <Section title="Header">
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <Header
            navItems={[
              { label: "Escolas", href: "#escolas" },
              { label: "Listas", href: "#listas" },
            ]}
            actions={<Button size="sm">Entrar</Button>}
          />
        </div>
      </Section>

      <Section title="Footer">
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <Footer
            columns={[
              { title: "Produto", items: [{ label: "Como funciona", href: "#como-funciona" }] },
              { title: "Legal", items: [{ label: "Termos", href: "#termos" }] },
            ]}
          />
        </div>
      </Section>
    </div>
  );
}
