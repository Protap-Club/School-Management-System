import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialYear = new Date().getFullYear();

const CreateTimetableDialog = ({ open, onOpenChange, onCreate, isPending = false, availableClasses = {} }) => {
    const standards = useMemo(() => availableClasses?.standards || [], [availableClasses]);
    const sections = useMemo(() => availableClasses?.sections || [], [availableClasses]);
    const classSections = useMemo(() => availableClasses?.classSections || [], [availableClasses]);

    const [form, setForm] = useState({
        standard: "",
        section: "",
        academicYear: String(initialYear),
    });

    const sectionsByStandard = useMemo(() => {
        const map = new Map();

        for (const pair of classSections) {
            const standard = String(pair?.standard || "").trim();
            const section = String(pair?.section || "").trim().toUpperCase();
            if (!standard || !section) continue;

            if (!map.has(standard)) {
                map.set(standard, new Set());
            }
            map.get(standard).add(section);
        }

        return map;
    }, [classSections]);

    const selectedStandard = form.standard || standards[0] || "";
    const normalizedSectionOptions = useMemo(() => {
        if (!selectedStandard) return sections;
        const byStandard = sectionsByStandard.get(selectedStandard);
        if (!byStandard) return sections;
        return [...byStandard].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    }, [sections, sectionsByStandard, selectedStandard]);
    const selectedSection = form.section && normalizedSectionOptions.includes(form.section)
        ? form.section
        : (normalizedSectionOptions[0] || "");

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!selectedStandard || !selectedSection) return;

        const payload = {
            standard: selectedStandard.trim(),
            section: selectedSection.trim(),
            academicYear: Number(form.academicYear),
        };
        const created = await onCreate(payload);
        if (created) {
            onOpenChange(false);
            setForm({
                standard: "",
                section: "",
                academicYear: String(initialYear),
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Timetable</DialogTitle>
                    <DialogDescription>
                        Add a class, section, and academic year to create a new timetable.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Standard</Label>
                        {standards.length > 0 ? (
                            <Select value={selectedStandard} onValueChange={(value) => setForm((prev) => ({ ...prev, standard: value, section: "" }))}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select standard" />
                                </SelectTrigger>
                                <SelectContent>
                                    {standards.map((standard) => (
                                        <SelectItem key={standard} value={standard}>
                                            {standard}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                required
                                value={selectedStandard}
                                onChange={(event) => setForm((prev) => ({ ...prev, standard: event.target.value }))}
                                placeholder="e.g. 10th"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Section</Label>
                        <Select value={selectedSection} onValueChange={(value) => setForm((prev) => ({ ...prev, section: value }))}>
                            <SelectTrigger className="w-full" disabled={normalizedSectionOptions.length === 0}>
                                <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                            <SelectContent>
                                {normalizedSectionOptions.map((section) => (
                                    <SelectItem key={section} value={section}>
                                        {section}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Academic Year</Label>
                        <Input
                            type="number"
                            min="2000"
                            max="2100"
                            required
                            value={form.academicYear}
                            onChange={(event) => setForm((prev) => ({ ...prev, academicYear: event.target.value }))}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending || !selectedStandard || !selectedSection}>
                            {isPending ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateTimetableDialog;
