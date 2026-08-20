import type { DnsCapability, HostingCapability, PaymentCapability, RegistrarCapability } from "../providers/contracts";
import { COMMERCIAL_PROVIDER_VERIFICATION_MODE, ReadOnlyMutationBlockedError } from "./mode";

export type WriteCounter = { count: number };

function blocked(capability: string, writes: WriteCounter): never {
  void COMMERCIAL_PROVIDER_VERIFICATION_MODE;
  throw new ReadOnlyMutationBlockedError(capability);
}

export function wrapRegistrarReadOnly(inner: RegistrarCapability, writes: WriteCounter = { count: 0 }): RegistrarCapability {
  return {
    providerKey: inner.providerKey,
    searchDomains: (queries) => inner.searchDomains(queries),
    getAvailability: (domain) => inner.getAvailability(domain),
    getRegistrationPrice: (domain) => inner.getRegistrationPrice(domain),
    getRenewalPrice: (domain) => inner.getRenewalPrice(domain),
    registerDomain: async () => {
      return blocked("registerDomain", writes);
    },
    configureNameservers: async () => {
      return blocked("configureNameservers", writes);
    },
  };
}

export function wrapDnsReadOnly(inner: DnsCapability, writes: WriteCounter = { count: 0 }): DnsCapability {
  return {
    providerKey: inner.providerKey,
    getZone: (zoneName) => inner.getZone(zoneName),
    listRecords: (zoneName) => inner.listRecords(zoneName),
    verifyRecord: (zoneName, record) => inner.verifyRecord(zoneName, record),
    createZone: async () => {
      return blocked("createZone", writes);
    },
    createRecord: async () => {
      return blocked("createRecord", writes);
    },
    updateRecord: async () => {
      return blocked("updateRecord", writes);
    },
    deleteRecord: async () => {
      return blocked("deleteRecord", writes);
    },
  };
}

export function wrapHostingReadOnly(inner: HostingCapability, writes: WriteCounter = { count: 0 }): HostingCapability {
  return {
    providerKey: inner.providerKey,
    getDeployment: (projectId, deploymentId) => inner.getDeployment(projectId, deploymentId),
    verifyDomain: (projectId, domain) => inner.verifyDomain(projectId, domain),
    createProject: async () => {
      return blocked("createProject", writes);
    },
    configureProject: async () => {
      return blocked("configureProject", writes);
    },
    deploy: async () => {
      return blocked("deploy", writes);
    },
    attachDomain: async () => {
      return blocked("attachDomain", writes);
    },
    rollback: async () => {
      return blocked("rollback", writes);
    },
  };
}

export function wrapPaymentsReadOnly(inner: PaymentCapability, writes: WriteCounter = { count: 0 }): PaymentCapability {
  return {
    providerKey: inner.providerKey,
    verifyWebhookEndpoint: (secret, signature, payload) => inner.verifyWebhookEndpoint(secret, signature, payload),
    parseWebhookEvent: (payload) => inner.parseWebhookEvent(payload),
    getTransaction: (id) => inner.getTransaction(id),
    getSubscription: (id) => inner.getSubscription(id),
    createProduct: async () => {
      return blocked("createProduct", writes);
    },
    createPrice: async () => {
      return blocked("createPrice", writes);
    },
    updatePrice: async () => {
      return blocked("updatePrice", writes);
    },
    archivePrice: async () => {
      return blocked("archivePrice", writes);
    },
    createCheckoutConfiguration: async () => {
      return blocked("createCheckoutConfiguration", writes);
    },
  };
}
