"use client";

import { Bot, Dumbbell, FileJson, Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ExerciseCatalogItem } from "@/exercise-catalog/catalog";
import { mergeExerciseCatalogs, parseExerciseCatalogJson } from "@/exercise-catalog/schema";
import type { Sport } from "@/types/domain";

const sports: Sport[] = [
  "running",
  "tabata",
  "strength",
  "mobility",
  "rowing",
  "cycling",
  "swimming",
  "bouldering",
  "rock_climbing",
  "yoga",
  "walking",
  "hiking"
];

interface OpenAIStatus {
  configured: boolean;
  model: string;
}

export function ExerciseCatalogManager({
  catalog,
  onCatalogChange
}: {
  catalog: ExerciseCatalogItem[];
  onCatalogChange: (catalog: ExerciseCatalogItem[]) => void;
}) {
  const [status, setStatus] = useState<OpenAIStatus>();
  const [json, setJson] = useState("");
  const [message, setMessage] = useState<string>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState(
    "Create exercise catalog items for marathon-support Tabata: bodyweight squat, glute bridge, Bulgarian split squat left/right, dead bug, bird dog, side plank left/right."
  );
  const [draft, setDraft] = useState<ExerciseCatalogItem>({
    id: "new_exercise",
    name: "New exercise",
    sport: "strength",
    muscles: ["core"],
    description: "Short technique description.",
    imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
    videoUrl: "https://www.youtube.com/results?search_query=exercise+technique",
    defaultDurationSeconds: 40,
    previewDurationSeconds: 10,
    restDurationSeconds: 20
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/openai")
      .then((response) => response.json() as Promise<OpenAIStatus>)
      .then((nextStatus) => {
        if (!cancelled) {
          setStatus(nextStatus);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({ configured: false, model: "unknown" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFile(file?: File) {
    if (!file) {
      return;
    }

    const content = await file.text();
    setJson(content);
    importCatalog(content);
  }

  function importCatalog(content = json) {
    try {
      const parsed = parseExerciseCatalogJson(JSON.parse(content));
      if (!parsed.success) {
        setMessage(parsed.errors.join("\n"));
        return;
      }

      const nextCatalog = mergeExerciseCatalogs(catalog, parsed.items);
      onCatalogChange(nextCatalog);
      setMessage(`Imported ${parsed.items.length} catalog items`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid exercise catalog JSON.");
    }
  }

  function addDraft() {
    const parsed = parseExerciseCatalogJson({ items: [draft] });
    if (!parsed.success) {
      setMessage(parsed.errors.join("\n"));
      return;
    }

    onCatalogChange(mergeExerciseCatalogs(catalog, parsed.items));
    setMessage(`Added ${draft.name}`);
  }

  async function generateCatalogItems() {
    if (!status?.configured) {
      setMessage("OpenAI is not configured. Catalog items can still be added manually or imported from JSON.");
      return;
    }

    setIsGenerating(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/openai/exercise-catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const result = (await response.json()) as unknown;

      if (!response.ok) {
        const error = result && typeof result === "object" && "error" in result ? String(result.error) : "Catalog generation failed.";
        setMessage(error);
        return;
      }

      const parsed = parseExerciseCatalogJson(result);
      if (!parsed.success) {
        setMessage(parsed.errors.join("\n"));
        return;
      }

      onCatalogChange(mergeExerciseCatalogs(catalog, parsed.items));
      setMessage(`Generated ${parsed.items.length} catalog items`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Catalog generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Exercise Catalog</CardTitle>
            <CardDescription>Shared definitions resolved by exerciseId</CardDescription>
          </div>
          <Badge>{catalog.length} items</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border p-3 text-sm text-muted-foreground">
          <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
            <Dumbbell className="h-4 w-4" aria-hidden />
            Plan JSON can reference catalog IDs
          </div>
          Exercise definitions no longer need to be duplicated inside every plan, as long as the referenced IDs exist here.
        </div>

        <div className="space-y-2">
          {catalog.slice(0, 6).map((exercise) => (
            <div key={exercise.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{exercise.name}</p>
                <Badge>{exercise.sport}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {exercise.muscles.map((muscle) => (
                  <Badge key={`${exercise.id}-${muscle}`} className="bg-muted text-muted-foreground">
                    {formatMuscleName(muscle)}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <label>
                <Upload className="h-4 w-4" aria-hidden />
                Upload catalog
                <input
                  type="file"
                  accept="application/json"
                  className="sr-only"
                  onChange={(event) => void handleFile(event.target.files?.[0])}
                />
              </label>
            </Button>
            <Button type="button" onClick={() => importCatalog()}>
              <FileJson className="h-4 w-4" aria-hidden />
              Import catalog
            </Button>
          </div>
          <Textarea
            value={json}
            onChange={(event) => setJson(event.target.value)}
            placeholder='{"items":[{"id":"bodyweight_squat","name":"Bodyweight squat"...}]}'
            className="font-mono text-xs"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="catalog-id">ID</Label>
            <Input id="catalog-id" value={draft.id} onChange={(event) => setDraft((current) => ({ ...current, id: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="catalog-name">Name</Label>
            <Input id="catalog-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="catalog-sport">Sport</Label>
            <Select
              id="catalog-sport"
              value={draft.sport}
              onChange={(event) => setDraft((current) => ({ ...current, sport: event.target.value as Sport }))}
            >
              {sports.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="catalog-muscles">Muscles</Label>
            <Input
              id="catalog-muscles"
              value={draft.muscles.join(", ")}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  muscles: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="catalog-description">Description</Label>
            <Textarea
              id="catalog-description"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="catalog-work">Work seconds</Label>
            <Input
              id="catalog-work"
              inputMode="numeric"
              value={String(draft.defaultDurationSeconds)}
              onChange={(event) => setDraft((current) => ({ ...current, defaultDurationSeconds: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="catalog-preview">Preview seconds</Label>
            <Input
              id="catalog-preview"
              inputMode="numeric"
              value={String(draft.previewDurationSeconds)}
              onChange={(event) => setDraft((current) => ({ ...current, previewDurationSeconds: Number(event.target.value) }))}
            />
          </div>
          <Button className="sm:col-span-2" type="button" onClick={addDraft}>
            <Plus className="h-4 w-4" aria-hidden />
            Add exercise
          </Button>
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot className="h-4 w-4" aria-hidden />
              OpenAI catalog extension
            </div>
            <Badge className={status?.configured ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
              {status?.configured ? status.model : "JSON/manual only"}
            </Badge>
          </div>
          <Textarea value={prompt} disabled={!status?.configured || isGenerating} onChange={(event) => setPrompt(event.target.value)} />
          <Button type="button" disabled={!status?.configured || isGenerating} onClick={() => void generateCatalogItems()}>
            <Bot className="h-4 w-4" aria-hidden />
            {isGenerating ? "Generating..." : "Generate catalog items"}
          </Button>
        </div>

        {message ? <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-muted-foreground">{message}</pre> : null}
      </CardContent>
    </Card>
  );
}

function formatMuscleName(value: string) {
  return value.replaceAll("_", " ");
}
