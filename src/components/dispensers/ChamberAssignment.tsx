'use client';

import { useEffect, useState, useCallback } from 'react';
import { Chamber } from '@/types/dispenser';
import { Medication } from '@/types/medication';

type ChamberAssignment = {
  chamberId: string;
  chamberNumber: number;
  medicationId: string;
  dosageAmount: number;
};

type ChamberAssignmentProps = {
  chambers: Chamber[];
  initialAssignments?: ChamberAssignment[];
  onChange: (assignments: ChamberAssignment[]) => void;
};

export default function ChamberAssignment({
  chambers,
  initialAssignments = [],
  onChange,
}: ChamberAssignmentProps) {
  const [assignments, setAssignments] = useState<ChamberAssignment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch available medications
  useEffect(() => {
    const fetchMedications = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/medications?pageSize=100');

        if (!response.ok) {
          throw new Error('Failed to fetch medications');
        }

        const data = await response.json();
        setMedications(data.items);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load medications'
        );
        console.error('Error loading medications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, []);

  // Initialize assignments from props or create new ones for empty chambers
  useEffect(() => {
    if (!isInitialized) {
      if (initialAssignments && initialAssignments.length > 0) {
        // Use provided assignments if they exist
        setAssignments(initialAssignments);
      } else if (chambers.length > 0) {
        // Create default empty assignments for each chamber
        const initialChamberAssignments = chambers.map((chamber) => ({
          chamberId: chamber.id,
          chamberNumber: chamber.chamberNumber,
          medicationId: '',
          dosageAmount: 1,
        }));
        setAssignments(initialChamberAssignments);
      }
      setIsInitialized(true);
    }
  }, [chambers, initialAssignments, isInitialized]);

  // Notify parent component when assignments change, but only filtered assignments
  // Use useCallback to prevent recreating this function on every render
  const notifyParent = useCallback(() => {
    const filteredAssignments = assignments.filter(
      (a) => a.medicationId !== ''
    );
    onChange(filteredAssignments);
  }, [assignments, onChange]);

  // Call notifyParent when assignments change but after initialization
  useEffect(() => {
    if (isInitialized && assignments.length > 0) {
      notifyParent();
    }
  }, [assignments, isInitialized, notifyParent]);

  // Handle assignment updates
  const updateAssignment = (
    chamberId: string,
    field: string,
    value: string | number
  ) => {
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.chamberId === chamberId
          ? { ...assignment, [field]: value }
          : assignment
      )
    );
  };

  if (loading) {
    return <div className='skeleton h-32 w-full'></div>;
  }

  if (error) {
    return (
      <div className='alert alert-error'>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <h3 className='text-lg font-semibold'>Chamber Assignments</h3>

      <div className='grid gap-4'>
        {chambers
          .sort((a, b) => a.chamberNumber - b.chamberNumber)
          .map((chamber) => {
            const assignment = assignments.find(
              (a) => a.chamberId === chamber.id
            ) || {
              chamberId: chamber.id,
              chamberNumber: chamber.chamberNumber,
              medicationId: '',
              dosageAmount: 1,
            };

            return (
              <div
                key={chamber.id}
                className='card bg-base-100 shadow-sm'>
                <div className='card-body p-4'>
                  <h4 className='font-semibold'>
                    Chamber {chamber.chamberNumber}
                  </h4>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='form-control'>
                      <label className='label'>
                        <span className='label-text'>Medication</span>
                      </label>
                      <select
                        className='select select-bordered w-full'
                        value={assignment.medicationId}
                        onChange={(e) =>
                          updateAssignment(
                            chamber.id,
                            'medicationId',
                            e.target.value
                          )
                        }>
                        <option value=''>None (Empty Chamber)</option>
                        {medications.map((medication) => (
                          <option
                            key={medication.id}
                            value={medication.id}>
                            {medication.name} ({medication.dosageUnit})
                          </option>
                        ))}
                      </select>
                    </div>

                    {assignment.medicationId && (
                      <div className='form-control'>
                        <label className='label'>
                          <span className='label-text'>Dosage Amount</span>
                        </label>
                        <input
                          type='number'
                          className='input input-bordered w-full'
                          min='1'
                          value={assignment.dosageAmount}
                          onChange={(e) =>
                            updateAssignment(
                              chamber.id,
                              'dosageAmount',
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                        />
                      </div>
                    )}
                  </div>

                  {assignment.medicationId && (
                    <div className='mt-2'>
                      <div className='badge badge-outline'>
                        {medications.find(
                          (m) => m.id === assignment.medicationId
                        )?.stockLevel || 0}{' '}
                        {medications.find(
                          (m) => m.id === assignment.medicationId
                        )?.dosageUnit || ''}{' '}
                        in stock
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {assignments.every((a) => !a.medicationId) && (
        <div className='alert alert-warning'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='stroke-current shrink-0 h-6 w-6'
            fill='none'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
            />
          </svg>
          <span>
            No medications assigned. At least one chamber must have a medication
            assigned.
          </span>
        </div>
      )}
    </div>
  );
}
