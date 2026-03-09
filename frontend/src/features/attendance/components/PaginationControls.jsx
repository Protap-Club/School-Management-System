import React from 'react';
import { Button } from "@/components/ui/button";

const PaginationControls = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const start = totalItems === 0 ? 0 : currentPage * itemsPerPage + 1;
    const end = Math.min((currentPage + 1) * itemsPerPage, totalItems);

    return (
        <div className="flex items-center justify-between px-2">
            <div className="text-sm text-muted-foreground font-medium">
                Showing <span className="text-foreground">{start}</span>-<span className="text-foreground">{end}</span> of <span className="text-foreground">{totalItems}</span>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(0, currentPage - 1))} disabled={currentPage === 0}>
                    Previous
                </Button>
                <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNum;
                        if (totalPages <= 5) pageNum = i;
                        else if (currentPage < 3) pageNum = i;
                        else if (currentPage > totalPages - 4) pageNum = totalPages - 5 + i;
                        else pageNum = currentPage - 2 + i;
                        if (pageNum >= totalPages) return null;

                        return (
                            <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "ghost"}
                                size="sm"
                                className="w-8 h-8 p-0 hidden sm:inline-flex"
                                onClick={() => onPageChange(pageNum)}
                            >
                                {pageNum + 1}
                            </Button>
                        );
                    })}
                </div>
                <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage >= totalPages - 1}>
                    Next
                </Button>
            </div>
        </div>
    );
};

export default PaginationControls;
