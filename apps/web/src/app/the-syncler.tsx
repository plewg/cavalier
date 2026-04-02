"use client";

import { Popover } from "@base-ui/react";
import { useMutationState } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FiActivity, FiAlertOctagon, FiCheckCircle } from "react-icons/fi";

export function TheSyncler() {
    const activeMutationCount = useMutationState({
        filters: { status: "pending" },
    }).length;

    const erroredMutations = useMutationState({
        filters: { status: "error" },
    });

    const [isFirst, setIsFirst] = useState(true);

    useEffect(() => {
        if (isFirst && activeMutationCount > 0) {
            setIsFirst(false);
        }
    }, [activeMutationCount, isFirst]);

    if (erroredMutations.length > 0) {
        const message = erroredMutations.map((m) => m.failureReason).join(", ");

        return (
            <div>
                <Popover.Root>
                    <Popover.Trigger openOnHover>
                        <FiAlertOctagon
                            size="22px"
                            title={message}
                            className="text-red-600"
                        />
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Positioner>
                            <Popover.Popup className="rounded-md border-2 border-indigo-50 bg-slate-800 p-2">
                                <Popover.Title className="text-lg font-bold text-red-600">
                                    Error
                                </Popover.Title>
                                <Popover.Description>
                                    {message}
                                </Popover.Description>
                            </Popover.Popup>
                        </Popover.Positioner>
                    </Popover.Portal>
                </Popover.Root>
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
                <FiCheckCircle
                    size="22px"
                    className="text-green-400 opacity-0"
                    style={{
                        animation: isFirst ? undefined : "fadeout 1500ms",
                    }}
                />
            )}
        </div>
    );
}
