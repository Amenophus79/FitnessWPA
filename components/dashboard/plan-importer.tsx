"use client";

import { FileJson, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ExerciseCatalogItem } from "@/exercise-catalog/catalog";
import { parseTrainingPlanJson } from "@/features/import/training-plan-schema";
import type { Plan } from "@/types/domain";

export function PlanImporter({ catalog = [], onImport }: { catalog?: ExerciseCatalogItem[]; onImport: (plan: Plan) => void }) {
  const [json, setJson] = useState("");
  const [message, setMessage] = useState<string>();

  async function handleFile(file?: File) {
    if (!file) {
      return;
    }

    const content = await file.text();
    setJson(content);
    importJson(content);
  }

  function importJson(content = json) {
    try {
      const parsed = parseTrainingPlanJson(JSON.parse(content), undefined, { catalog });
      if (!parsed.success) {
        setMessage(parsed.errors.join("\n"));
        return;
      }

      onImport(parsed.plan);
      setMessage(`Imported ${parsed.plan.title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid JSON file.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>JSON Import</CardTitle>
        <CardDescription>Available without Supabase or OpenAI, with exercise IDs resolved from the catalog</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <label>
              <Upload className="h-4 w-4" aria-hidden />
              Upload JSON
              <input
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
            </label>
          </Button>
          <Button type="button" onClick={() => importJson()}>
            <FileJson className="h-4 w-4" aria-hidden />
            Validate import
          </Button>
        </div>
        <Textarea
          value={json}
          onChange={(event) => setJson(event.target.value)}
          placeholder='{"version":"1.0","title":"Plan"...}'
          className="font-mono text-xs"
        />
        {message ? <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-muted-foreground">{message}</pre> : null}
      </CardContent>
    </Card>
  );
}
