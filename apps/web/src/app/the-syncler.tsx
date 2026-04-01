"use client";

import { useMutationState } from "@tanstack/react-query";
import { FiActivity, FiAlertOctagon, FiCheckCircle } from "react-icons/fi";

export function TheSyncler() {
    const activeMutationCount = useMutationState({
        filters: { status: "pending" },
    }).length;

    const erroredMutations = useMutationState({
        filters: { status: "error" },
    });

    if (erroredMutations.length > 0) {
        const message = erroredMutations.map((m) => m.failureReason).join(", ");

        return (
            <div>
                <FiAlertOctagon
                    size="22px"
                    title={message}
                    className="text-red-700"
                />
            </div>
        );
    }

    return (
        <div>
            {activeMutationCount > 0 ? (
                <FiActivity
                    size="22px"
                    className="animate-pulse text-yellow-500"
                />
            ) : (
                <FiCheckCircle size="22px" className="text-green-400" />
            )}
        </div>
    );
}
