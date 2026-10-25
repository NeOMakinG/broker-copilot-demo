import { z } from "zod";
import { Insurer } from "@/schemas/insurer";

// Fictional insurer panel.
export const insurers = z.array(Insurer).parse([
  { id: "ins_001", name: "Meridian Commercial" },
  { id: "ins_002", name: "Aldgate Underwriting" },
  { id: "ins_003", name: "Calder Insurance" },
  { id: "ins_004", name: "Northgate Mutual" },
  { id: "ins_005", name: "Stonebridge Specialty" },
  { id: "ins_006", name: "Tamar and Severn Underwriting" },
]);
