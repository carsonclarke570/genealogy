import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar } from "@/components/ui/avatar";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Swatch({
  name,
  className,
  text = "text-foreground",
}: {
  name: string;
  className: string;
  text?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className={`flex h-16 items-end rounded-lg border border-border p-2 ${className}`}
      >
        <span className={`text-xs font-medium ${text}`}>Aa</span>
      </div>
      <p className="text-xs text-muted-foreground">{name}</p>
    </div>
  );
}

export default function StyleGuide() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      {/* Header */}
      <header className="mb-12 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Badge variant="secondary">Design system</Badge>
          <h1 className="text-4xl font-semibold tracking-tight">Family Tree</h1>
          <p className="max-w-xl text-muted-foreground">
            The visual foundation for the genealogy app — clean &amp; modern,
            with serif headings and an indigo accent. Toggle light/dark to see
            tokens respond.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="space-y-16">
        {/* Color tokens */}
        <Section
          title="Color"
          description="Semantic tokens. Every component references these — not raw hex — so light/dark and future re-skins are one edit away."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            <Swatch name="background" className="bg-background" />
            <Swatch
              name="foreground"
              className="bg-foreground"
              text="text-background"
            />
            <Swatch name="card" className="bg-card" />
            <Swatch
              name="muted"
              className="bg-muted"
              text="text-muted-foreground"
            />
            <Swatch
              name="primary"
              className="bg-primary"
              text="text-primary-foreground"
            />
            <Swatch
              name="accent"
              className="bg-accent"
              text="text-accent-foreground"
            />
            <Swatch
              name="destructive"
              className="bg-destructive"
              text="text-destructive-foreground"
            />
            <Swatch
              name="success"
              className="bg-success"
              text="text-success-foreground"
            />
          </div>
        </Section>

        {/* Typography */}
        <Section
          title="Typography"
          description="Source Serif 4 for headings (h1–h6 default to it). Geist Sans for body and UI."
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-5xl font-semibold tracking-tight">
                The quiet record
              </h1>
              <p className="text-xs text-muted-foreground">
                h1 · serif · 3rem / semibold
              </p>
            </div>
            <Separator />
            <div className="space-y-1">
              <h2 className="text-3xl font-semibold tracking-tight">
                Generations remembered
              </h2>
              <p className="text-xs text-muted-foreground">
                h2 · serif · 1.875rem
              </p>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="max-w-2xl leading-relaxed">
                Body copy in Geist Sans. Records, notes, and document captions
                read here — comfortable line length, relaxed leading, and a
                muted secondary color for supporting text.
              </p>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Muted secondary text for dates, places, and metadata.
              </p>
              <p className="text-xs text-muted-foreground">
                body · sans · 1rem · with muted variants
              </p>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section
          title="Buttons"
          description="Variants and sizes via class-variance-authority. Focus rings are token-driven for accessibility."
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </Section>

        {/* Forms */}
        <Section
          title="Form controls"
          description="Inputs, textareas, and labels — the building blocks for adding people and uploading documents."
        >
          <div className="grid max-w-xl gap-5">
            <div className="grid gap-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input id="full-name" placeholder="e.g. Eleanor Whitfield" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birthplace">Birthplace</Label>
              <Input id="birthplace" placeholder="City, region, country" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Biographical notes, sources, anecdotes…"
              />
            </div>
          </div>
        </Section>

        {/* Badges */}
        <Section
          title="Badges"
          description="For document types and statuses across the archive."
        >
          <div className="flex flex-wrap gap-3">
            <Badge>Photo</Badge>
            <Badge variant="secondary">Obituary</Badge>
            <Badge variant="outline">Article</Badge>
            <Badge variant="success">Verified</Badge>
            <Badge variant="destructive">Missing source</Badge>
          </div>
        </Section>

        {/* Cards / domain preview */}
        <Section
          title="Cards"
          description="A glimpse of how primitives compose — here, a person record as it might appear in the tree."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar fallback="EW" />
                  <div>
                    <CardTitle>Eleanor Whitfield</CardTitle>
                    <CardDescription>
                      1901 – 1987 · Leeds, England
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Schoolteacher and amateur botanist. Three children. Emigrated
                  to Canada in 1952.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">3 photos</Badge>
                  <Badge variant="outline">Birth certificate</Badge>
                  <Badge variant="outline">Obituary</Badge>
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm">View record</Button>
                <Button size="sm" variant="outline">
                  Open in tree
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add a person</CardTitle>
                <CardDescription>
                  Start a new record and attach documents later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="quick-name">Name</Label>
                  <Input id="quick-name" placeholder="Full name" />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Create record</Button>
              </CardFooter>
            </Card>
          </div>
        </Section>
      </div>

      <footer className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
        Design system foundation · components live in{" "}
        <code className="font-mono text-xs">src/components/ui</code>, tokens in{" "}
        <code className="font-mono text-xs">src/app/globals.css</code>.
      </footer>
    </main>
  );
}
