-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Criação da tabela de usuários
create table public.users (
  uid uuid references auth.users not null primary key,
  email text not null,
  name text not null,
  role text not null check (role in ('student', 'staff')),
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Criação da tabela de solicitações
create table public.requests (
  id uuid default gen_random_uuid() primary key,
  "studentId" uuid references public.users(uid) not null,
  "studentName" text not null,
  title text not null,
  description text not null,
  status text not null check (status in ('pending', 'in-analysis', 'completed')),
  "attachmentUrl" text,
  "attachmentName" text,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Configuração de Storage (Bucket para anexos)
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true);

-- 4. Políticas de Segurança (Row Level Security - RLS)
alter table public.users enable row level security;
alter table public.requests enable row level security;

-- Políticas para users
create policy "Usuários podem ver todos os perfis" 
  on public.users for select using (true);

create policy "Usuários podem inserir seu próprio perfil" 
  on public.users for insert with check (auth.uid() = uid);

-- Políticas para requests
create policy "Estudantes veem suas solicitações, staff vê todas" 
  on public.requests for select using (
    auth.uid() = "studentId" or 
    exists (select 1 from public.users where uid = auth.uid() and role = 'staff')
  );

create policy "Apenas estudantes podem criar solicitações" 
  on public.requests for insert with check (
    auth.uid() = "studentId" and 
    exists (select 1 from public.users where uid = auth.uid() and role = 'student')
  );

create policy "Apenas staff pode atualizar status" 
  on public.requests for update using (
    exists (select 1 from public.users where uid = auth.uid() and role = 'staff')
  );

create policy "Apenas estudantes podem deletar solicitações pendentes" 
  on public.requests for delete using (
    auth.uid() = "studentId" and status = 'pending'
  );

-- Políticas para storage
create policy "Qualquer um pode ver anexos"
  on storage.objects for select using ( bucket_id = 'attachments' );

create policy "Estudantes podem fazer upload de anexos"
  on storage.objects for insert with check (
    bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]
  );
