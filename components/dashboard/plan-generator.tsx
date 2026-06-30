"use client";

import { Bot, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ExerciseCatalogItem } from "@/exercise-catalog/catalog";
import { parseTrainingPlanJson } from "@/features/import/training-plan-schema";
import { promptTemplates } from "@/openai/prompt-templates";
import type { Plan } from "@/types/domain";
import type { Sport } from "@/types/domain";
import { formatSportLabel, supportedSports } from "@/types/sports";

interface OpenAIStatus {
  configured: boolean;
  model: string;
}

export function PlanGenerator({ catalog = [], onImport }: { catalog?: ExerciseCatalogItem[]; onImport: (plan: Plan) => void }) {
  const [status, setStatus] = useState<OpenAIStatus>();
  const [template, setTemplate] = useState("");
  const [selectedSports, setSelectedSports] = useState<Sport[]>([]);
  const [prompt, setPrompt] = useState("Create a 6 week training plan using the selected sports.");
  const [message, setMessage] = useState<string>();
  const [isGenerating, setIsGenerating] = useState(false);

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

  const configured = status?.configured === true;

  function toggleSport(sport: Sport) {
    setSelectedSports((current) =>
      current.includes(sport) ? current.filter((item) => item !== sport) : [...current, sport]
    );
  }

  async function generatePlan() {
    if (!configured) {
      setMessage("OpenAI is not configured. New plans can be loaded from JSON, but cannot be generated here.");
      return;
    }

    if (selectedSports.length === 0) {
      setMessage("Select at least one sport before generating a plan.");
      return;
    }

    if (!prompt.trim()) {
      setMessage("Describe the plan goal before generating a plan.");
      return;
    }

    setIsGenerating(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, template, catalog, sports: selectedSports })
      });
      const result = (await response.json()) as unknown;

      if (!response.ok) {
        const error = result && typeof result === "object" && "error" in result ? String(result.error) : "Plan generation failed.";
        setMessage(error);
        return;
      }

      const parsed = parseTrainingPlanJson(result, undefined, { catalog });
      if (!parsed.success) {
        setMessage(parsed.errors.join("\n"));
        return;
      }

      onImport(parsed.plan);
      setMessage(`Generated and imported ${parsed.plan.title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Plan generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Plan Generation</CardTitle>
            <CardDescription>Optional OpenAI integration</CardDescription>
          </div>
          <Badge className={configured ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
            {configured ? `OpenAI: ${status?.model}` : "JSON import only"}
          </Badge>
          <Badge className="border bg-background text-foreground">Catalog: {catalog.length}</Badge>
          <Badge className="border bg-background text-foreground">Sports: {selectedSports.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!configured ? (
          <div className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm text-foreground">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <Bot className="h-4 w-4" aria-hidden />
              OpenAI is not configured
            </div>
            <p className="text-muted-foreground">
              You can load new plans from JSON files or pasted JSON. Creating plans from prompts is available after
              `OPENAI_API_KEY` is configured on the server.
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="prompt-template">Template</Label>
          <Select
            id="prompt-template"
            value={template}
            disabled={!configured || isGenerating}
            onChange={(event) => setTemplate(event.target.value)}
          >
            <option value="">No template</option>
            {promptTemplates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Sports</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {supportedSports.map((sport) => {
              const checked = selectedSports.includes(sport);

              return (
                <label
                  key={sport}
                  className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                    checked ? "border-primary bg-primary/10 text-primary" : "bg-background text-foreground"
                  } ${!configured || isGenerating ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-current"
                    checked={checked}
                    disabled={!configured || isGenerating}
                    onChange={() => toggleSport(sport)}
                  />
                  <span>{formatSportLabel(sport)}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plan-prompt">Prompt</Label>
          <Textarea
            id="plan-prompt"
            value={prompt}
            disabled={!configured || isGenerating}
            placeholder="Describe the goal, duration, schedule, constraints, or event date."
            onChange={(event) => setPrompt(event.target.value)}
          />
        </div>

        <Button
          type="button"
          disabled={!configured || isGenerating || selectedSports.length === 0 || !prompt.trim()}
          onClick={() => void generatePlan()}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {isGenerating ? "Generating..." : "Generate plan"}
        </Button>

        {message ? <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-muted-foreground">{message}</pre> : null}
      </CardContent>
    </Card>
  );
}
