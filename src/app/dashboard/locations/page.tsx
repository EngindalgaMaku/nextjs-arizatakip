'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Location, LocationFormData } from '@/types/locations'; // Import the Location type and LocationFormData type
import { fetchLocations, createLocation, updateLocation, deleteLocation, moveLocation } from '@/actions/locationActions'; // Import the server action
import LocationForm from '@/components/locations/LocationForm'; // Import form
import LocationsTable from '@/components/locations/LocationsTable'; // Import the table
import LocationQRCodeModal from '@/components/locations/LocationQRCodeModal'; // Import QR Code Modal
import LocationPropertiesModal from '@/components/locations/LocationPropertiesModal'; // Import Properties Modal
import Swal from 'sweetalert2'; // For feedback
import { PlusIcon, PrinterIcon, MagnifyingGlassIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'; // For button icon
// Import other necessary components and hooks later
// import LocationsTable from '@/components/locations/LocationsTable';

// Define the location types for filtering
const locationTypes = [
  { value: 'sinif', label: 'Sınıf' },
  { value: 'laboratuvar', label: 'Laboratuvar' },
  { value: 'idare', label: 'İdare' },
  { value: 'ogretmenler_odasi', label: 'Öğretmenler Odası' },
  { value: 'atolye', label: 'Atölye' },
  { value: 'diger', label: 'Diğer' },
];

// Define department options for filtering
const departments = [
  { value: 'bilisim', label: 'Bilişim Teknolojileri' },
  { value: 'elektronik', label: 'Elektrik-Elektronik' },
  { value: 'makine', label: 'Makine' },
  { value: 'tekstil', label: 'Tekstil' },
  { value: 'muhasebe', label: 'Muhasebe' },
  { value: 'ortak_alan', label: 'Ortak Kullanım' },
  { value: 'diger', label: 'Diğer' },
];

// Page size options
const pageSizeOptions = [5, 10, 20, 50];

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]); // Use Location type
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // State for form submission
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State for edit modal
  const [editingLocation, setEditingLocation] = useState<Location | null>(null); // State for location being edited
  const [isDeleting, setIsDeleting] = useState(false); // State for delete operation
  const [isMoving, setIsMoving] = useState(false); // State for move operation
  const [isQrModalOpen, setIsQrModalOpen] = useState(false); // State for QR modal
  const [qrCodeLocation, setQrCodeLocation] = useState<Location | null>(null); // State for QR location
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false); // State for properties modal
  const [viewingPropertiesLocation, setViewingPropertiesLocation] = useState<Location | null>(null); // State for properties data
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedLocations = await fetchLocations();
      setLocations(fetchedLocations);
    } catch (err) {
      console.error('Failed to load locations:', err);
      setError(
        err instanceof Error ? err.message : 'Konumlar yüklenirken bir hata oluştu.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []); // Add useCallback dependency array

  useEffect(() => {
    loadLocations();
  }, [loadLocations]); // Use useCallback function here

  // Filter and search locations
  const filteredLocations = useMemo(() => {
    return locations.filter(location => {
      // Apply search filter
      const matchesSearch = !searchTerm || 
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (location.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Apply type filter
      const matchesType = !typeFilter || location.type === typeFilter;
      
      // Apply department filter
      const matchesDepartment = !departmentFilter || location.department === departmentFilter;
      
      return matchesSearch && matchesType && matchesDepartment;
    });
  }, [locations, searchTerm, typeFilter, departmentFilter]);

  // Calculate pagination
  const totalItems = filteredLocations.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Reset to first page when filters change or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, departmentFilter, pageSize]);
  
  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  
  // Get paginated data
  const paginatedLocations = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLocations.slice(startIndex, startIndex + pageSize);
  }, [filteredLocations, currentPage, pageSize]);

  const handleOpenPrintView = () => {
    window.open('/dashboard/locations/print', '_blank');
  };

  const handleCreateLocation = async (formData: LocationFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createLocation(formData);
      if (result.success && result.location) {
        await loadLocations(); 
        setIsCreateModalOpen(false);
        Swal.fire('Başarılı!', 'Konum başarıyla oluşturuldu.', 'success');
      } else {
        throw new Error(result.error || 'Konum oluşturulamadı.');
      }
    } catch (err) {
       console.error('Failed to create location:', err);
       const errorMsg = err instanceof Error ? err.message : 'Konum oluşturulurken bir hata oluştu.';
       setError(errorMsg); // Set error state for potential display
       Swal.fire('Hata!', errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setIsEditModalOpen(true);
  };

  const handleUpdateLocation = async (formData: LocationFormData) => {
    if (!editingLocation) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await updateLocation(editingLocation.id, formData);
      if (result.success) {
        await loadLocations();
        setIsEditModalOpen(false);
        setEditingLocation(null);
        Swal.fire('Başarılı!', 'Konum başarıyla güncellendi.', 'success');
      } else {
         throw new Error(result.error || 'Konum güncellenemedi.');
      }
    } catch (err) {
      console.error('Failed to update location:', err);
      const errorMsg = err instanceof Error ? err.message : 'Konum güncellenirken bir hata oluştu.';
      setError(errorMsg);
      Swal.fire('Hata!', errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    // Confirmation Dialog
    const confirmation = await Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu konum kalıcı olarak silinecek!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'İptal'
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    setIsDeleting(true); // Use separate state for delete loading indicator
    setError(null);
    try {
      const result = await deleteLocation(locationId);
      if (result.success) {
        await loadLocations(); 
        Swal.fire('Silindi!', 'Konum başarıyla silindi.', 'success');
      } else {
        throw new Error(result.error || 'Konum silinemedi.');
      }
    } catch (err) {
      console.error('Failed to delete location:', err);
      const errorMsg = err instanceof Error ? err.message : 'Konum silinirken bir hata oluştu.';
      setError(errorMsg);
      Swal.fire('Hata!', errorMsg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveLocation = async (locationId: string, direction: 'up' | 'down') => {
    setIsMoving(true);
    setError(null);
    try {
      const result = await moveLocation(locationId, direction);
      if (result.success) {
        // Re-fetch to show the new order
        await loadLocations(); 
        // No success message needed usually, UI update is enough
      } else {
        throw new Error(result.error || 'Konum taşınamadı.');
      }
    } catch (err) {
      console.error('Failed to move location:', err);
      const errorMsg = err instanceof Error ? err.message : 'Konum taşınırken bir hata oluştu.';
      setError(errorMsg);
      Swal.fire('Hata!', errorMsg, 'error');
    } finally {
      setIsMoving(false);
    }
  };

  const handleViewQrCode = (location: Location) => {
    if (location.barcode_value) {
      setQrCodeLocation(location);
      setIsQrModalOpen(true);
    } else {
      Swal.fire('Hata', 'Bu konum için henüz bir barkod değeri atanmamış.', 'warning');
    }
  };

  const handleViewProperties = (location: Location) => {
    setViewingPropertiesLocation(location);
    setIsPropertiesModalOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
  };

  const handleDepartmentFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDepartmentFilter(e.target.value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setDepartmentFilter('');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
  };

  if (isLoading) {
    return <div>Yükleniyor...</div>; // Loading...
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Konum Yönetimi</h1>
      <p className="mt-1 text-gray-500">
        Okuldaki laboratuvarları, sınıfları ve diğer konumları yönetin.
      </p>

      {/* Search and Filter Section */}
      <div className="bg-white p-4 shadow rounded-lg mb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Konum ara..."
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          {/* Type Filter */}
          <div className="w-full sm:w-48">
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={typeFilter}
              onChange={handleTypeFilterChange}
            >
              <option value="">Tüm Tipler</option>
              {locationTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          {/* Department Filter */}
          <div className="w-full sm:w-48">
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={departmentFilter}
              onChange={handleDepartmentFilterChange}
            >
              <option value="">Tüm Departmanlar</option>
              {departments.map(department => (
                <option key={department.value} value={department.value}>{department.label}</option>
              ))}
            </select>
          </div>
          
          {/* Clear Filters Button - Only show if any filter is active */}
          {(searchTerm || typeFilter || departmentFilter) && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>

        {/* Results Count */}
        <div className="mt-2 text-sm text-gray-500">
          {totalItems} konum bulundu
          {(searchTerm || typeFilter || departmentFilter) && ' (filtrelenmiş)'}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        {/* Print All Button */}
        <button
          type="button"
          onClick={handleOpenPrintView}
          disabled={locations.length === 0} // Disable if no locations
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          <PrinterIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Tüm Barkodları Yazdır
        </button>

        {/* Add New Button */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Yeni Konum Ekle
        </button>
      </div>

      {/* --- Locations Table --- */}
      <div className="bg-white p-4 shadow rounded-lg">
         {/* Pass filtered locations to the table */}
        <LocationsTable 
          locations={paginatedLocations} 
          onEdit={handleEditLocation}
          onDelete={handleDeleteLocation}
          onViewQrCode={handleViewQrCode}
          onViewProperties={handleViewProperties}
          onMove={handleMoveLocation}
          isLoading={isDeleting || isMoving || isSubmitting}
        />

        {/* Pagination Controls */}
        {totalItems > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center border-t pt-4">
            {/* Page Size Selector */}
            <div className="flex items-center mb-3 sm:mb-0">
              <span className="text-sm text-gray-700 mr-2">Sayfa başına:</span>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                İlk
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              
              <span className="text-sm text-gray-700">
                Sayfa {currentPage} / {totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Son
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* --- Modals --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 flex justify-center items-center p-4">
          {/* Replace with your actual Modal component */}
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
            <h2 className="text-lg font-medium mb-4">Yeni Konum Oluştur</h2>
            <LocationForm 
              onSubmit={handleCreateLocation}
              onClose={() => setIsCreateModalOpen(false)}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Edit Location Modal - Placeholder */}
       {isEditModalOpen && editingLocation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 flex justify-center items-center p-4">
          {/* Replace with your actual Modal component */}
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
            <h2 className="text-lg font-medium mb-4">Konum Düzenle</h2>
            <LocationForm 
              initialData={editingLocation}
              onSubmit={handleUpdateLocation}
              onClose={() => {
                setIsEditModalOpen(false);
                setEditingLocation(null);
              }}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQrModalOpen && (
        <LocationQRCodeModal
          location={qrCodeLocation}
          onClose={() => {
            setIsQrModalOpen(false);
            setQrCodeLocation(null);
          }}
        />
      )}

      {/* Properties Modal */}
      {isPropertiesModalOpen && (
        <LocationPropertiesModal
          location={viewingPropertiesLocation}
          onClose={() => {
            setIsPropertiesModalOpen(false);
            setViewingPropertiesLocation(null);
          }}
        />
      )}
    </div>
  );
} 