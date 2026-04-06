from django.shortcuts import render, redirect
from .models import Room
from django.contrib.auth.decorators import login_required

@login_required
def rooms_page(request):
    if request.method == 'POST':

        # ✅ DELETE LOGIC (ADDED)
        if 'delete_id' in request.POST:
            Room.objects.filter(id=request.POST.get('delete_id')).delete()
            return redirect('rooms')

        room_number = request.POST.get('room_number')
        room_type = request.POST.get('room_type')
        price = request.POST.get('price')
        capacity = request.POST.get('capacity')

        # ✅ SAFETY CHECK (ADDED)
        if not room_number:
            return redirect('rooms')

        Room.objects.create(
            room_number=room_number,
            room_type=room_type,
            price_per_night=price,
            capacity=capacity
        )

        return redirect('rooms')

    rooms = Room.objects.all()

    return render(request, 'rooms.html', {'rooms': rooms})