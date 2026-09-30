import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';

export interface PaginationProps {
  page: number;           // current page (1-based)
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;     // e.g. "pilots", "technicians"; default "items"
  alwaysShow?: boolean;   // default false -> hidden when totalPages <= 1
}

/**
 * Reusable numbered-page pagination component.
 * Mobile (<768px): stacked layout (info text above, buttons below), 3 page number buttons.
 * Desktop (>=768px): side-by-side layout, 5 page number buttons.
 */
export default function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  itemLabel = 'items',
  alwaysShow = false,
}: PaginationProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Hide when only 1 page (unless alwaysShow)
  if (!alwaysShow && totalPages <= 1) {
    return null;
  }

  // Calculate showing range
  const startItem = ((page - 1) * pageSize) + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  // Mobile shows 3 page buttons, desktop shows 5
  const maxButtons = Math.min(isMobile ? 3 : 5, totalPages);

  const pageNumbers: number[] = [];
  for (let i = 0; i < maxButtons; i++) {
    let pageNum;
    if (totalPages <= maxButtons) {
      pageNum = i + 1;
    } else if (page <= Math.ceil(maxButtons / 2)) {
      pageNum = i + 1;
    } else if (page >= totalPages - Math.floor(maxButtons / 2)) {
      pageNum = totalPages - (maxButtons - 1) + i;
    } else {
      pageNum = page - Math.floor(maxButtons / 2) + i;
    }
    pageNumbers.push(pageNum);
  }

  return (
    <View style={[styles.paginationContainer, isMobile && styles.paginationContainerMobile]}>
      {/* Info text */}
      <Text style={[styles.paginationText, isMobile && styles.paginationTextMobile]}>
        Showing {startItem}–{endItem} of {totalCount} {itemLabel}
      </Text>

      {/* Controls row */}
      <View style={[styles.paginationControls, isMobile && styles.paginationControlsMobile]}>
        {/* First « */}
        <TouchableOpacity
          style={[
            styles.paginationButton,
            isMobile && styles.paginationButtonMobile,
            page === 1 && styles.paginationButtonDisabled,
          ]}
          onPress={() => onPageChange(1)}
          disabled={page === 1}
        >
          <Text style={[styles.paginationButtonText, page === 1 && styles.paginationButtonTextDisabled]}>
            «
          </Text>
        </TouchableOpacity>

        {/* Prev ‹ */}
        <TouchableOpacity
          style={[
            styles.paginationButton,
            isMobile && styles.paginationButtonMobile,
            page === 1 && styles.paginationButtonDisabled,
          ]}
          onPress={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          <Text style={[styles.paginationButtonText, page === 1 && styles.paginationButtonTextDisabled]}>
            ‹
          </Text>
        </TouchableOpacity>

        {/* Numbered page buttons */}
        {pageNumbers.map((pageNum) => (
          <TouchableOpacity
            key={pageNum}
            style={[
              styles.paginationButton,
              isMobile && styles.paginationButtonMobile,
              page === pageNum && styles.paginationButtonActive,
            ]}
            onPress={() => onPageChange(pageNum)}
          >
            <Text style={[
              styles.paginationButtonText,
              page === pageNum && styles.paginationButtonTextActive,
            ]}>
              {pageNum}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Next › */}
        <TouchableOpacity
          style={[
            styles.paginationButton,
            isMobile && styles.paginationButtonMobile,
            page === totalPages && styles.paginationButtonDisabled,
          ]}
          onPress={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          <Text style={[styles.paginationButtonText, page === totalPages && styles.paginationButtonTextDisabled]}>
            ›
          </Text>
        </TouchableOpacity>

        {/* Last » */}
        <TouchableOpacity
          style={[
            styles.paginationButton,
            isMobile && styles.paginationButtonMobile,
            page === totalPages && styles.paginationButtonDisabled,
          ]}
          onPress={() => onPageChange(totalPages)}
          disabled={page === totalPages}
        >
          <Text style={[styles.paginationButtonText, page === totalPages && styles.paginationButtonTextDisabled]}>
            »
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Desktop: side-by-side row
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  // Mobile: stack info text above buttons
  paginationContainerMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  paginationText: {
    fontSize: 13,
    color: '#6B7280',
  },
  paginationTextMobile: {
    fontSize: 12,
    textAlign: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paginationControlsMobile: {
    gap: 5,
  },
  // Desktop button
  paginationButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    minWidth: 36,
    alignItems: 'center',
  },
  // Mobile button — smaller padding so all 7 buttons fit in ~360px
  paginationButtonMobile: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    minWidth: 34,
  },
  paginationButtonActive: {
    backgroundColor: '#535CE8',
    borderColor: '#535CE8',
  },
  paginationButtonDisabled: {
    opacity: 0.45,
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  paginationButtonTextActive: {
    color: '#FFFFFF',
  },
  paginationButtonTextDisabled: {
    color: '#9CA3AF',
  },
});
