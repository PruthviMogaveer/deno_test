import { supabase } from "../supabase.ts";

export async function getProjects(userId?: string) {
    try {
      if (!userId) {
        return [];
      }

      // Get user's company and role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', userId)
        .single();
      console.log(userData);

      if (userError || !userData) {
        console.error('Error fetching user data:', userError);
        return [];
      }

      if (userData.role !== 'admin') {
        return []; // Only admins can see projects
      }

      const userCompanyId = userData.company_id;
      if (!userCompanyId) {
        return [];
      }
      // Get all project IDs where user's company is assigned via project_companies
      const assignedProjectIds = await getAssignedProjectIds(userCompanyId);
      
      // Build query based on whether there are assigned projects
      let query = supabase
        .from('projects')
        .select('*');

      if (assignedProjectIds) {
        // User's company is main company OR assigned via project_companies
        query = query.or(`company_id.eq.${userCompanyId},id.in.(${assignedProjectIds})`);
      } else {
        // User's company is only main company
        query = query.eq('company_id', userCompanyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }

      const list = data || [];
      // Deduplicate by project id
      const unique = Array.from(new Map(list.map((p: any) => [p.id, p])).values());

      // Build worker counts from project_staff
      const projectIds = unique.map((p: any) => p.id).filter(Boolean);
      let workerCounts: Record<string, number> = {};
      if (projectIds.length > 0) {
        const { data: staffRows, error: staffErr } = await supabase
          .from('project_staff')
          .select('project_id')
          .in('project_id', projectIds);

        if (!staffErr && Array.isArray(staffRows)) {
          workerCounts = staffRows.reduce((acc: Record<string, number>, row: any) => {
            const pid = row.project_id;
            acc[pid] = (acc[pid] || 0) + 1;
            return acc;
          }, {});
        }
      }

      // Normalize: ensure each project has .active boolean and .workers count
      const normalized = unique.map((p: any) => {
        const active = typeof p.active === 'boolean' ? p.active : (p.status === 'active');
        const workers = Number.isFinite(p.workers) ? p.workers : (workerCounts[p.id] || 0);
        return { ...p, active, workers } ;
      });

      return normalized;
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      throw error;
    }
  }

  async function getAssignedProjectIds(companyId: number) {
    try {
      const { data, error } = await supabase
        .from('project_companies')
        .select('project_id')
        .eq('company_id', companyId);

      if (error) {
        console.error('Error fetching assigned projects:', error);
        return null;
      }

      const projectIds = data?.map((pc: any) => pc.project_id).filter((id: any) => id) || [];
      return projectIds.length > 0 ? projectIds.join(',') : null;
    } catch (error) {
      console.error('Failed to fetch assigned projects:', error);
      return null;
    }
  }
