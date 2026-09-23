"use client";

import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ALL: Role[] = ["admin", "finance", "teacher", "student", "parent"];

type Item = { icon: string; label: string; href: string; visible: Role[] };

const menuItems: { title: string; items: Item[] }[] = [
  {
    title: "MENU",
    items: [
      { icon: "/home.png", label: "Home", href: "/", visible: ALL },
      { icon: "/teacher.png", label: "Lecturers", href: "/list/teachers", visible: ["admin", "finance", "teacher"] },
      { icon: "/student.png", label: "Students", href: "/list/students", visible: ["admin", "finance", "teacher"] },
      { icon: "/parent.png", label: "Guardians", href: "/list/parents", visible: ["admin", "finance", "teacher"] },
      { icon: "/subject.png", label: "Units", href: "/list/subjects", visible: ["admin", "teacher"] },
      { icon: "/class.png", label: "Classes", href: "/list/classes", visible: ["admin", "teacher"] },
      { icon: "/lesson.png", label: "Timetable", href: "/list/lessons", visible: ["admin", "teacher"] },
      { icon: "/exam.png", label: "Exams", href: "/list/exams", visible: ALL },
      { icon: "/assignment.png", label: "CATs & Assignments", href: "/list/assignments", visible: ALL },
      { icon: "/result.png", label: "Results", href: "/list/results", visible: ALL },
      { icon: "/result.png", label: "Transcript", href: "/transcript", visible: ["student", "parent"] },
      { icon: "/attendance.png", label: "Attendance", href: "/list/attendance", visible: ALL },
      { icon: "/calendar.png", label: "Events", href: "/list/events", visible: ALL },
      { icon: "/message.png", label: "Messages", href: "/list/messages", visible: ALL },
      { icon: "/announcement.png", label: "Announcements", href: "/list/announcements", visible: ALL },
    ],
  },
  {
    title: "FEES",
    items: [
      { icon: "/finance.png", label: "Fee statement", href: "/fees/statement", visible: ["student", "parent"] },
      { icon: "/finance.png", label: "Pay / report payment", href: "/fees/payments", visible: ["student", "parent"] },
      { icon: "/finance.png", label: "Finance overview", href: "/finance", visible: ["admin"] },
      { icon: "/finance.png", label: "Payments", href: "/fees/payments", visible: ["admin", "finance"] },
      { icon: "/finance.png", label: "Invoices", href: "/fees/invoices", visible: ["admin", "finance"] },
      { icon: "/finance.png", label: "HELB & bursary transfers", href: "/fees/remittances", visible: ["admin", "finance"] },
      { icon: "/finance.png", label: "Fee structures", href: "/fees/structures", visible: ALL },
      { icon: "/finance.png", label: "Funding schemes", href: "/fees/schemes", visible: ["admin", "finance"] },
    ],
  },
  {
    title: "INSTITUTION",
    items: [
      { icon: "/singleBranch.png", label: "Faculties", href: "/list/faculties", visible: ["admin"] },
      { icon: "/singleBranch.png", label: "Departments", href: "/list/departments", visible: ["admin"] },
      { icon: "/singleClass.png", label: "Programmes", href: "/list/programmes", visible: ["admin"] },
      { icon: "/profile.png", label: "Office staff", href: "/list/staff", visible: ["admin"] },
    ],
  },
  {
    title: "OTHER",
    items: [
      { icon: "/profile.png", label: "Profile", href: "/profile", visible: ALL },
      { icon: "/setting.png", label: "Settings", href: "/settings", visible: ALL },
      { icon: "/logout.png", label: "Logout", href: "/logout", visible: ALL },
    ],
  },
];

const Menu = ({ expanded = false, onNavigate }: { expanded?: boolean; onNavigate?: () => void }) => {
  const { role, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  if (!role) return null;

  const home = `/${role}`;

  return (
    <nav className="mt-4 text-sm">
      {menuItems.map((section) => {
        const items = section.items.filter((i) => i.visible.includes(role));
        if (!items.length) return null;
        return (
          <div className="flex flex-col gap-2" key={section.title}>
            <span className={`${expanded ? "block" : "hidden lg:block"} text-gray-400 font-light my-4`}>
              {section.title}
            </span>
            {items.map((item) => {
              const href = item.href === "/" ? home : item.href;
              const current = pathname === href || (href !== home && pathname.startsWith(href + "/"));
              const className = `flex items-center ${
                expanded ? "justify-start px-2" : "justify-center lg:justify-start md:px-2"
              } gap-4 text-gray-500 py-2 rounded-md hover:bg-lamaSkyLight ${current ? "bg-lamaSkyLight" : ""}`;
              const content = (
                <>
                  <Image src={item.icon} alt="" width={20} height={20} />
                  <span className={expanded ? "block" : "hidden lg:block"}>{item.label}</span>
                </>
              );
              if (item.href === "/logout") {
                return (
                  <button
                    key={item.label}
                    title={item.label}
                    className={className}
                    onClick={async () => {
                      await signOut();
                      router.replace("/");
                    }}
                  >
                    {content}
                  </button>
                );
              }
              return (
                <Link
                  href={href}
                  key={item.label}
                  title={item.label}
                  className={className}
                  aria-current={current ? "page" : undefined}
                  onClick={onNavigate}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
};

export default Menu;
