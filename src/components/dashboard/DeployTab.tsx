import { useState, useEffect } from "react";
import {
  fetchPortainerTemplates,
  fetchPortainerEndpoints,
  fetchPortainerTemplate,
  deployStack,
  fetchPortainerStacks,
  deleteStack
} from "@/lib/api";
import { PortainerTemplate, PortainerEndpoint, PortainerStack, PortainerTemplateVariable } from "@/types/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Rocket,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  Container
} from "lucide-react";

export function DeployTab() {
  // State for templates and endpoints
  const [templates, setTemplates] = useState<PortainerTemplate[]>([]);
  const [endpoints, setEndpoints] = useState<PortainerEndpoint[]>([]);
  const [stacks, setStacks] = useState<PortainerStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<number | null>(null);
  const [stackName, setStackName] = useState("");
  const [templateDetails, setTemplateDetails] = useState<PortainerTemplate | null>(null);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  // API Key state
  const [apiKey, setApiKey] = useState("");

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stackToDelete, setStackToDelete] = useState<{ id: number; endpointId: number; name: string } | null>(null);

  // Load templates, endpoints, and stacks on mount
  useEffect(() => {
    loadData();
  }, []);

  // Load template details when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateDetails(selectedTemplate);
    } else {
      setTemplateDetails(null);
      setEnvVars({});
    }
  }, [selectedTemplate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesData, endpointsData, stacksData] = await Promise.all([
        fetchPortainerTemplates(),
        fetchPortainerEndpoints(),
        fetchPortainerStacks()
      ]);

      setTemplates(templatesData);
      setEndpoints(endpointsData);
      setStacks(stacksData);
    } catch (error) {
      console.error("Failed to load Portainer data:", error);
      toast.error("Failed to load Portainer data");
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateDetails = async (templateId: number) => {
    try {
      const details = await fetchPortainerTemplate(templateId);
      setTemplateDetails(details);

      // Initialize env vars with defaults
      const defaultVars: Record<string, string> = {};
      details.Variables?.forEach((variable: PortainerTemplateVariable) => {
        defaultVars[variable.name] = variable.default || "";
      });
      setEnvVars(defaultVars);
    } catch (error) {
      console.error("Failed to load template details:", error);
      toast.error("Failed to load template details");
    }
  };

  const handleDeploy = async () => {
    if (!selectedTemplate || !selectedEndpoint || !stackName || !apiKey) {
      toast.error("Please fill in all required fields");
      return;
    }

    setDeploying(true);
    try {
      // Convert env vars to array format
      const envVarsArray = Object.entries(envVars).map(([name, value]) => ({
        name,
        value
      }));

      await deployStack({
        name: stackName,
        template_id: selectedTemplate,
        endpoint_id: selectedEndpoint,
        env_vars: envVarsArray
      }, apiKey);

      toast.success(`Stack "${stackName}" deployed successfully!`);

      // Reset form
      setSelectedTemplate(null);
      setSelectedEndpoint(null);
      setStackName("");
      setEnvVars({});

      // Reload stacks
      const stacksData = await fetchPortainerStacks();
      setStacks(stacksData);
    } catch (error: any) {
      console.error("Deployment failed:", error);
      toast.error(error.message || "Deployment failed");
    } finally {
      setDeploying(false);
    }
  };

  const handleDeleteStack = async () => {
    if (!stackToDelete || !apiKey) return;

    try {
      await deleteStack(stackToDelete.id, stackToDelete.endpointId, apiKey);
      toast.success(`Stack "${stackToDelete.name}" deleted successfully`);

      // Reload stacks
      const stacksData = await fetchPortainerStacks();
      setStacks(stacksData);
    } catch (error: any) {
      console.error("Failed to delete stack:", error);
      toast.error(error.message || "Failed to delete stack");
    } finally {
      setDeleteDialogOpen(false);
      setStackToDelete(null);
    }
  };

  const openDeleteDialog = (stack: PortainerStack) => {
    setStackToDelete({
      id: stack.Id,
      endpointId: stack.EndpointId,
      name: stack.Name
    });
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Key Input */}
      <Card>
        <CardHeader>
          <CardTitle>API Authentication</CardTitle>
          <CardDescription>
            Enter your API key to deploy and manage stacks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Deploy New Stack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Deploy New Stack
          </CardTitle>
          <CardDescription>
            Select a template and endpoint to deploy a new container stack
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Template Selector */}
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={selectedTemplate?.toString() || ""}
                onValueChange={(value) => setSelectedTemplate(Number(value))}
              >
                <SelectTrigger id="template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <SelectItem value="none" disabled>No templates available</SelectItem>
                  ) : (
                    templates.map((template) => (
                      <SelectItem key={template.Id} value={template.Id.toString()}>
                        {template.Title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Endpoint Selector */}
            <div className="space-y-2">
              <Label htmlFor="endpoint">Target Server (Endpoint)</Label>
              <Select
                value={selectedEndpoint?.toString() || ""}
                onValueChange={(value) => setSelectedEndpoint(Number(value))}
              >
                <SelectTrigger id="endpoint">
                  <SelectValue placeholder="Select a server" />
                </SelectTrigger>
                <SelectContent>
                  {endpoints.length === 0 ? (
                    <SelectItem value="none" disabled>No endpoints available</SelectItem>
                  ) : (
                    endpoints.map((endpoint) => (
                      <SelectItem key={endpoint.Id} value={endpoint.Id.toString()}>
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          {endpoint.Name} ({endpoint.URL})
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Stack Name */}
            <div className="space-y-2">
              <Label htmlFor="stack-name">Stack Name</Label>
              <Input
                id="stack-name"
                placeholder="my-stack"
                value={stackName}
                onChange={(e) => setStackName(e.target.value)}
              />
            </div>
          </div>

          {/* Template Details and Variables */}
          {templateDetails && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h4 className="font-medium mb-2">Template Details</h4>
                <p className="text-sm text-muted-foreground">{templateDetails.Description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">
                    {templateDetails.Type === 1 ? "Docker Swarm" : "Docker Compose"}
                  </Badge>
                  <Badge variant="outline">{templateDetails.Platform}</Badge>
                </div>
              </div>

              {/* Environment Variables */}
              {templateDetails.Variables && templateDetails.Variables.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Environment Variables</h4>
                  {templateDetails.Variables.map((variable) => (
                    <div key={variable.name} className="space-y-2">
                      <Label htmlFor={`var-${variable.name}`}>
                        {variable.label}
                        {variable.description && (
                          <span className="text-sm text-muted-foreground ml-2">
                            ({variable.description})
                          </span>
                        )}
                      </Label>

                      {/* Check if variable has select options */}
                      {variable.select && variable.select.length > 0 ? (
                        <Select
                          value={envVars[variable.name] || ""}
                          onValueChange={(value) => setEnvVars({ ...envVars, [variable.name]: value })}
                        >
                          <SelectTrigger id={`var-${variable.name}`}>
                            <SelectValue placeholder={`Select ${variable.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {variable.select.map((option: any) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex flex-col">
                                  <span>{option.text}</span>
                                  {option.description && (
                                    <span className="text-xs text-muted-foreground">
                                      {option.description}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`var-${variable.name}`}
                          placeholder={variable.default || ""}
                          value={envVars[variable.name] || ""}
                          onChange={(e) => setEnvVars({ ...envVars, [variable.name]: e.target.value })}
                          disabled={variable.preset}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deploy Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTemplate(null);
                setSelectedEndpoint(null);
                setStackName("");
                setEnvVars({});
              }}
            >
              Reset
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={!selectedTemplate || !selectedEndpoint || !stackName || !apiKey || deploying}
            >
              {deploying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Deploy Stack
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deployed Stacks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Container className="h-5 w-5" />
              Deployed Stacks
            </CardTitle>
            <CardDescription>
              Manage your currently deployed container stacks
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No stacks deployed yet
                    </TableCell>
                  </TableRow>
                ) : (
                  stacks.map((stack) => {
                    const endpoint = endpoints.find(e => e.Id === stack.EndpointId);
                    return (
                      <TableRow key={stack.Id}>
                        <TableCell className="font-mono font-semibold">{stack.Name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {stack.Type === 1 ? "Swarm" : "Compose"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {endpoint?.Name || `ID: ${stack.EndpointId}`}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {new Date(stack.CreationDate * 1000).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {stack.Status === 1 ? (
                            <Badge variant="default" className="flex items-center gap-1 w-fit">
                              <CheckCircle2 className="h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <XCircle className="h-3 w-3" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(stack)}
                            disabled={!apiKey}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stack</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the stack "{stackToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStack} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
