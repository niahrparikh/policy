import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <ul id="supabase-todos-list">
      {todos?.map((todo) => (
        <li key={todo.id} id={`todo-item-${todo.id}`}>{todo.name}</li>
      ))}
    </ul>
  )
}
