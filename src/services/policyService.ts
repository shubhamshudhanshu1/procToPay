import { prisma } from '../db/prisma';

/**
 * Policy Service
 *
 * Manages policy version for token staleness detection.
 * Policy version increments when roles/permissions change, invalidating old tokens.
 */

class PolicyService {
  private readonly POLICY_ID = 'policy';

  /**
   * Get current policy version
   *
   * @returns Current policy version number
   */
  async getPolicyVersion(): Promise<number> {
    const policy = await prisma.policyMeta.findUnique({
      where: { id: this.POLICY_ID },
    });

    if (!policy) {
      // Initialize policy if it doesn't exist
      const newPolicy = await prisma.policyMeta.create({
        data: {
          id: this.POLICY_ID,
          policyVer: 1,
        },
      });
      return newPolicy.policyVer;
    }

    return policy.policyVer;
  }

  /**
   * Increment policy version
   *
   * This should be called whenever roles or permissions change.
   * Old tokens with lower policyVer will be considered stale.
   *
   * @returns New policy version number
   */
  async incrementPolicyVersion(): Promise<number> {
    const currentPolicy = await prisma.policyMeta.findUnique({
      where: { id: this.POLICY_ID },
    });

    if (!currentPolicy) {
      // Initialize policy if it doesn't exist
      const newPolicy = await prisma.policyMeta.create({
        data: {
          id: this.POLICY_ID,
          policyVer: 1,
        },
      });
      return newPolicy.policyVer;
    }

    const updatedPolicy = await prisma.policyMeta.update({
      where: { id: this.POLICY_ID },
      data: {
        policyVer: currentPolicy.policyVer + 1,
      },
    });

    return updatedPolicy.policyVer;
  }

  /**
   * Check if policy has changed since a given version
   *
   * @param tokenPolicyVer Policy version from token
   * @returns true if policy has changed (token is stale)
   */
  async hasPolicyChanged(tokenPolicyVer: number): Promise<boolean> {
    const currentVersion = await this.getPolicyVersion();
    return currentVersion > tokenPolicyVer;
  }
}

export const policyService = new PolicyService();

