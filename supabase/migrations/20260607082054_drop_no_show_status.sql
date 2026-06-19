-- Retire the "no-show" booking status: fold historical no_show rows into cancelled.
update public.bookings set status = 'cancelled' where status = 'no_show';