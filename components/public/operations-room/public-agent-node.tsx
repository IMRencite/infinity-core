import type { PublicAgentProjection } from "@/lib/infinity/public-operations-projection/types";
import { agentMotion } from "@/lib/infinity/public-operations-room/format";
import styles from "./operations-room.module.css";

export function PublicAgentNode({ agent }: { agent: PublicAgentProjection }) {
  const motion = agentMotion(agent.public_status);
  return (
    <span
      className={`${styles.node} ${styles[motion]}`}
      data-public-agent-id={agent.public_agent_id}
      data-agent-status={agent.public_status}
      data-agent-motion={motion}
      title={`${agent.role}: ${agent.public_status}`}
    >
      <span className={styles.srOnly}>{`${agent.role} ${agent.public_status}`}</span>
    </span>
  );
}
