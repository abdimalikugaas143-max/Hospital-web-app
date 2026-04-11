import React from 'react';

const configs = {
  pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', classes: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', classes: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Completed', classes: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-100 text-red-800' },
  waiting: { label: 'Waiting', classes: 'bg-yellow-100 text-yellow-800' },
  called: { label: 'Called', classes: 'bg-blue-100 text-blue-800' },
  skipped: { label: 'Skipped', classes: 'bg-gray-100 text-gray-800' },
};

export default function StatusBadge({ status }) {
  const config = configs[status] || { label: status, classes: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  );
}
