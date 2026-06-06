"use server";

import { UserRole } from "@/types";
import { getSupabase } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

export async function changeUserRole(userId: string, newRole: UserRole) {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("set_user_role", {
    target_user_id: userId,
    new_role: newRole,
  });

  if (error) {
    console.error("Failed to change user role:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("delete_user", {
    target_user_id: userId,
  });

  if (error) {
    console.error("Failed to delete user:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function adminCreateUser(formData: FormData) {
  const email = formData.get("email")?.toString()?.trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const role = formData.get("role")?.toString() || "member";
  const defaultTreeRootId =
    formData.get("default_tree_root_id")?.toString()?.trim() || null;

  if (role !== "admin" && role !== "editor" && role !== "member") {
    return { error: "Vai trò không hợp lệ." };
  }

  const isActiveStr = formData.get("is_active")?.toString();
  const isActive = isActiveStr === "false" ? false : true;

  if (!email || !password) {
    return { error: "Email và mật khẩu là bắt buộc." };
  }

  const supabase = await getSupabase();

  const { error } = await supabase.rpc("admin_create_user", {
    new_email: email,
    new_password: password,
    new_role: role,
    new_active: isActive,
  });

  if (error) {
    console.error("Failed to create user:", error);
    return { error: error.message };
  }

  if (defaultTreeRootId) {
    const { data: adminUsers, error: usersError } = await supabase.rpc(
      "get_admin_users",
    );

    if (usersError) {
      console.error("Created user but failed to refetch user id:", usersError);
      return {
        error:
          "Đã tạo người dùng, nhưng chưa lưu được gốc gia phả mặc định: " +
          usersError.message,
      };
    }

    const createdUser = Array.isArray(adminUsers)
      ? adminUsers.find((user: { id?: string; email?: string }) => {
          return user.email?.toLowerCase() === email;
        })
      : null;

    if (createdUser?.id) {
      const { error: preferenceError } = await supabase.rpc(
        "upsert_user_root_preferences",
        {
          target_user_id: createdUser.id,
          p_default_tree_root_id: defaultTreeRootId,
          p_default_dual_ancestry_root_id: null,
          p_default_in_law_root_id: null,
          p_default_stats_root_id: null,
        },
      );

      if (preferenceError) {
        console.error(
          "Created user but failed to save default tree root:",
          preferenceError,
        );
        return {
          error:
            "Đã tạo người dùng, nhưng chưa lưu được gốc gia phả mặc định: " +
            preferenceError.message,
        };
      }
    }
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function toggleUserStatus(userId: string, newStatus: boolean) {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("set_user_active_status", {
    target_user_id: userId,
    new_status: newStatus,
  });

  if (error) {
    console.error("Failed to change user status:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}
