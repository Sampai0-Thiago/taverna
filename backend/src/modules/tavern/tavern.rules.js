/**
 * Máquina de estados de um item da Taverna — funções puras.
 *
 *   open ──claim──▶ claimed ──markBought──▶ bought
 *     ▲                │  ▲                    │
 *     └────release─────┘  └────unmarkBought────┘
 *     ▲                                        │
 *     └──────────────release───────────────────┘
 */
import { conflict, forbidden } from '../../utils/errors.js';

const isAssigneeOrMaster = (item, user) => user.role === 'master' || item.assigned_to === user.id;

export function claimTransition(item, user) {
  if (item.status !== 'open') throw conflict('Alguém já ficou com este item.');
  return { status: 'claimed', assignedTo: user.id };
}

export function releaseTransition(item, user) {
  if (item.status === 'open') throw conflict('Este item não tem responsável.');
  if (!isAssigneeOrMaster(item, user)) throw forbidden('Só o responsável ou o mestre pode liberar o item.');
  return { status: 'open', assignedTo: null };
}

export function statusTransition(item, user, nextStatus) {
  if (item.status === 'open') throw conflict('Assuma o item antes de mudar o status.');
  if (!isAssigneeOrMaster(item, user)) throw forbidden('Só o responsável ou o mestre pode mudar o status.');
  return { status: nextStatus, assignedTo: item.assigned_to };
}
