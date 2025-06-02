import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/services/supabase.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createTenantDto: CreateTenantDto) {
    const client = this.supabaseService.getAdminClient();

    const { data, error } = await client
      .from('tenants')
      .insert(createTenantDto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAll() {
    const client = this.supabaseService.getAdminClient();
    const { data, error } = await client.from('tenants').select('*');

    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    const client = this.supabaseService.getAdminClient();
    const { data, error } = await client
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    const client = this.supabaseService.getAdminClient();
    const { data, error } = await client
      .from('tenants')
      .update(updateTenantDto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const client = this.supabaseService.getAdminClient();
    const { error } = await client.from('tenants').delete().eq('id', id);

    if (error) throw error;
    return { id };
  }
}
