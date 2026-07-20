export type InteractiveElement = {
  role: string;
  label: string;
  selector: string;
  disabled: boolean;
};

export type DomNode = {
  tag: string;
  role: string | null;
  name: string | null;
  selector: string;
  text: string;
  children: DomNode[];
};

export type FormSummary = {
  selector: string;
  action: string;
  method: string;
  fields: string[];
};

export type TableSummary = {
  selector: string;
  caption: string;
  headers: string[];
  rowCount: number;
};

export type DomSnapshot = {
  landmarks: string[];
  headings: string[];
  forms: FormSummary[];
  tables: TableSummary[];
  tree: DomNode[];
};

export type PageContext = {
  url: string;
  title: string;
  text: string;
  selectedText: string;
  interactiveElements: InteractiveElement[];
  dom: DomSnapshot;
};

export type ExtensionMessage = { type: "OPEN_SIDE_PANEL" } | { type: "GET_PAGE_CONTEXT" };

export type ProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};
