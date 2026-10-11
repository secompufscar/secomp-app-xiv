import api from "./api";
import { checkedAdminTestCertificate, type AdminTestCertificate } from "../utils/certificateAdminPreview";
export type { AdminTestCertificate } from "../utils/certificateAdminPreview";

export async function getAdminTestCertificate(signal?: AbortSignal): Promise<AdminTestCertificate> {
  return checkedAdminTestCertificate((await api.get("/certificates/admin/preview", { signal, timeout: 20000 })).data);
}
