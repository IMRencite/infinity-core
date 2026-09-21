import type { PublicAgentProjection } from "@/lib/infinity/public-operations-projection/types";
import { agentMotion, agentPresence } from "@/lib/infinity/public-operations-room/format";
import styles from "./operations-room.module.css";

export function PublicAgentNode({ agent }: { agent: PublicAgentProjection }) {
  const motion = agentMotion(agent.public_status);
  const presence = agentPresence(agent.public_status);
  return (
    <span
      className={`${styles.node} ${styles[motion]}`}
      data-public-agent-id={agent.public_agent_id}
      data-agent-status={agent.public_status}
      data-agent-motion={motion}
      data-agent-presence={presence}
      title={`${agent.role}: ${agent.public_status}`}
    >
      <span className={styles.nodeRing} aria-hidden="true" />
      <span className={styles.nodeArc} aria-hidden="true" />
      <span className={styles.nodeFloor} aria-hidden="true" />
      <span className={styles.srOnly}>{`${agent.role} ${agent.public_status}`}</span>
    </span>
  );
}
