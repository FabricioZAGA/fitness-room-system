import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2, Mail, Phone, Plus, Users } from "lucide-react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterTabs } from "@/components/shared/FilterTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { StudentStatusBadge } from "@/components/shared/StatusBadge";
import { CreateStudentModal } from "@/components/shared/CreateStudentModal";
import { useStudents } from "@/hooks/useStudents";
import { getInitials } from "@/lib/utils";
import type { StudentStatus } from "@/types/student";

export const Route = createFileRoute("/students/")({
  component: StudentsPage,
});

type FilterValue = StudentStatus | "all";

function StudentsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
    { label: t("students.allStatuses"), value: "all" },
    { label: t("common.active"), value: "active" },
    { label: t("common.inactive"), value: "inactive" },
    { label: t("common.suspended"), value: "suspended" },
  ];
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const statusParam = filter === "all" ? undefined : filter;
  const { data, isLoading } = useStudents({ status: statusParam });

  const students = data?.items ?? [];
  const filtered = search
    ? students.filter(
        (s) =>
          s.full_name.toLowerCase().includes(search.toLowerCase()) ||
          s.email.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  const total = data?.total ?? 0;
  const subtitle = t("students.membersCount", { count: total });

  return (
    <PageWrapper>
      <PageHeader
        title={t("students.title")}
        subtitle={subtitle}
        action={{ label: t("students.newStudent"), icon: Plus, onClick: () => setCreateOpen(true) }}
      />

      {/* Search + Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("students.searchPlaceholder")}
        />
        <FilterTabs<FilterValue>
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[--gold]" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          message={search ? t("students.noMembersFound") : t("students.noStudents")}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((student) => (
            <Link
              key={student.student_id}
              to="/students/$studentId"
              params={{ studentId: student.student_id }}
              className="flex items-center justify-between rounded-xl border border-[--bd-default] bg-[--bg-surface] p-4 transition-all hover:border-[--gold-bd]"
            >
              <div className="flex items-center gap-4">
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={student.full_name}
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                    style={{ background: "var(--gold-bg)", color: "var(--gold)" }}
                  >
                    {getInitials(student.full_name)}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[--tx-primary]">{student.full_name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-[--tx-muted]">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {student.email}
                    </span>
                    {student.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {student.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <StudentStatusBadge status={student.status} />
            </Link>
          ))}
        </div>
      )}

      <CreateStudentModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </PageWrapper>
  );
}
